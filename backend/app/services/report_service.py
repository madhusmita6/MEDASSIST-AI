from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional
from app.models.report import UploadedReport
from app.services.rag_service import rag_service
from app.logging import logger

class ReportService:
    def list_reports(self, db: Session, patient_id: UUID) -> List[UploadedReport]:
        logger.info(f"Listing uploaded reports for patient: {patient_id}")
        return db.query(UploadedReport).filter(UploadedReport.patient_id == patient_id).all()

    def get_report(self, db: Session, report_id: UUID) -> Optional[UploadedReport]:
        return db.query(UploadedReport).filter(UploadedReport.id == report_id).first()

    def create_report_reference(
        self,
        db: Session,
        patient_id: UUID,
        filename: str,
        storage_path: str
    ) -> UploadedReport:
        logger.info(f"Recording report metadata: {filename} for patient {patient_id}")
        report = UploadedReport(
            patient_id=patient_id,
            filename=filename,
            storage_path=storage_path
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        return report

    def cache_report_summary(
        self,
        db: Session,
        report_id: UUID,
        summary_text: str
    ) -> UploadedReport:
        logger.info(f"Caching generated summary for report {report_id}")
        report = self.get_report(db, report_id)
        if not report:
            raise ValueError("Report not found")
        report.summary_cached = summary_text
        db.commit()
        db.refresh(report)
        return report

    def process_and_ingest_report(
        self,
        db: Session,
        patient_id: UUID,
        report_id: UUID,
        filename: str,
        text_content: str
    ) -> bool:
        """
        Coordinates full ingestion lifecycle:
        1. Index text chunks inside ChromaDB.
        2. Create mock summary context.
        3. Save summary back to SQL databases.
        """
        # Ingest to ChromaDB vector collection
        indexed = rag_service.ingest_document(
            patient_id=str(patient_id),
            report_id=str(report_id),
            filename=filename,
            text_content=text_content
        )
        
        if indexed:
            # Generate patient-friendly mock summary (to be replaced with LLM service)
            mock_summary = (
                f"Summary of {filename}: The report details metabolic trends. "
                "No critical levels identified. Key values are within reference norms."
            )
            self.cache_report_summary(db, report_id, mock_summary)
            return True
        return False

report_service = ReportService()
