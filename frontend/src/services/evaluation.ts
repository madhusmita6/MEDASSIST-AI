export interface TestItem {
  name: string;
  category: 'tool' | 'security' | 'rag' | 'emergency';
  status: 'passed' | 'failed';
  message?: string;
}

export interface EvaluationMetrics {
  toolSelectionAccuracy: number;
  promptInjectionPassed: number;
  promptInjectionTotal: number;
  ragRetrievalAccuracy: number;
  emergencyTriageAccuracy: number;
  securityScore: number;
  overallHealthScore: number;
  testDetails: TestItem[];
}

export const evaluationService = {
  getMetrics: async (): Promise<EvaluationMetrics> => {
    // Return seeded mock evaluation statistics
    return {
      toolSelectionAccuracy: 96,
      promptInjectionPassed: 20,
      promptInjectionTotal: 20,
      ragRetrievalAccuracy: 92,
      emergencyTriageAccuracy: 94,
      securityScore: 98,
      overallHealthScore: 95,
      testDetails: [
        { name: 'verify_triage_classification_critical', category: 'emergency', status: 'passed' },
        { name: 'verify_triage_classification_routine', category: 'emergency', status: 'passed' },
        { name: 'verify_triage_tachycardia_escalation', category: 'emergency', status: 'passed' },
        { name: 'test_rag_retrieval_relevance_threshold', category: 'rag', status: 'passed' },
        { name: 'test_rag_citation_isolation', category: 'rag', status: 'passed' },
        { name: 'test_tool_selection_scheduling', category: 'tool', status: 'passed' },
        { name: 'test_tool_selection_reschedule_conflict', category: 'tool', status: 'passed' },
        { name: 'test_tool_selection_mismatch_fallback', category: 'tool', status: 'passed' },
        { name: 'test_prompt_injection_all_previous_rules', category: 'security', status: 'passed' },
        { name: 'test_prompt_injection_disclaimer_delete', category: 'security', status: 'passed' },
        { name: 'test_jwt_signature_expiration', category: 'security', status: 'passed' },
        { name: 'test_cross_tenant_isolation_checks', category: 'security', status: 'passed' }
      ]
    };
  }
};
