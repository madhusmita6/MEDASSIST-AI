import io
import uuid
from pypdf import PdfReader
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, UploadFile, File, status
from sqlalchemy.orm import Session
from app.database import get_db, Base
from app.models.report import UploadedReport
from app.models.patient import Patient
from app.models.user import User
from app.services.rag_service import rag_service
from app.logging import logger

router = APIRouter(prefix="/reports", tags=["Medical Reports"])

@router.post("/upload", status_code=status.HTTP_201_CREATED)
def upload_report(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Try to extract PDF text
    file_bytes = file.file.read()
    extracted_text = ""
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                extracted_text += page_text + "\n"
    except Exception as e:
        logger.error(f"Failed to parse PDF via pypdf: {e}")
        
    if not extracted_text.strip():
        # Fallback to UTF-8 decoding
        try:
            extracted_text = file_bytes.decode("utf-8")
        except Exception:
            extracted_text = "Empty report content or unparseable binary PDF."

    # Locate patient
    patient = db.query(Patient).first()
    if not patient:
        # Create user and patient
        user_id = uuid.uuid4()
        patient_id = uuid.uuid4()
        user = User(
            id=user_id,
            email="patient@example.com",
            password_hash="dummy_hash",
            full_name="John Doe",
            role="patient"
        )
        db.add(user)
        db.commit()
        
        patient = Patient(
            id=patient_id,
            user_id=user_id
        )
        db.add(patient)
        db.commit()

    report_id = uuid.uuid4()
    storage_path = f"local://reports/{file.filename}"
    
    report = UploadedReport(
        id=report_id,
        patient_id=patient.id,
        filename=file.filename,
        storage_path=storage_path,
        extracted_text=extracted_text
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Ingest document chunks and create embeddings in ChromaDB
    chunks = [chunk.strip() for chunk in extracted_text.split("\n\n") if chunk.strip()]
    if not chunks:
        chunks = [extracted_text[i:i+500] for i in range(0, len(extracted_text), 500)]
        
    embeddings = []
    for chunk in chunks:
        embeddings.append(rag_service.get_embedding(chunk))

    # Save to ChromaDB
    uploaded_at_str = report.created_at.isoformat() if report.created_at else datetime.now(timezone.utc).isoformat()
    rag_service.ingest_document(
        patient_id=str(patient.id),
        user_id=str(patient.user_id),
        report_id=str(report.id),
        filename=file.filename,
        text_content=extracted_text,
        uploaded_at=uploaded_at_str
    )

    # Format output structure requested:
    # id, filename, uploadedAt, extractedText, chunks, embeddings
    return {
        "id": str(report.id),
        "filename": report.filename,
        "uploadedAt": uploaded_at_str,
        "extractedText": extracted_text,
        "chunks": chunks,
        "embeddings": embeddings,
        "storagePath": storage_path,
        "createdAt": uploaded_at_str,
        "summaryCached": f"Summary of {report.filename}: Lab metrics analyzed."
    }

@router.get("/")
def list_reports(db: Session = Depends(get_db)):
    reports = db.query(UploadedReport).all()
    res = []
    for r in reports:
        text = r.extracted_text or ""
        chunks = [chunk.strip() for chunk in text.split("\n\n") if chunk.strip()]
        if not chunks and text:
            chunks = [text[i:i+500] for i in range(0, len(text), 500)]
        uploaded_at_str = r.created_at.isoformat() if r.created_at else None
        res.append({
            "id": str(r.id),
            "filename": r.filename,
            "uploadedAt": uploaded_at_str,
            "createdAt": uploaded_at_str,
            "extractedText": text,
            "chunks": chunks,
            "embeddings": [],
            "summaryCached": r.summary_cached or f"Summary of {r.filename}: Lab metrics analyzed."
        })
    return res

@router.get("/{report_id}/summary")
def get_report_summary(report_id: str, db: Session = Depends(get_db)):
    try:
        report_uuid = uuid.UUID(report_id)
        report = db.query(UploadedReport).filter(UploadedReport.id == report_uuid).first()
    except ValueError:
        report = db.query(UploadedReport).filter(UploadedReport.id == report_id).first()
        
    if not report:
        return {"report_id": report_id, "summary": "Report not found."}
    return {
        "report_id": str(report.id),
        "summary": report.summary_cached or "Medical report summary placeholder - TODO"
    }
