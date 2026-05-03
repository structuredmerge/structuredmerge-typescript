import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export type DiagnosticSeverity = 'info' | 'warning' | 'error';

export type DiagnosticCategory =
  | 'parse_error'
  | 'destination_parse_error'
  | 'unsupported_feature'
  | 'fallback_applied'
  | 'ambiguity'
  | 'assumed_default'
  | 'configuration_error'
  | 'replay_rejected';

export type ReviewDiagnosticReason =
  | 'missing_required_payload'
  | 'family_mismatch'
  | 'request_not_found';

export interface ReviewDiagnosticDetail {
  readonly requestId?: string;
  readonly action?: ReviewDecisionAction;
  readonly reason?: ReviewDiagnosticReason;
  readonly payloadKind?: 'conformance_family_context';
  readonly expectedFamily?: string;
  readonly providedFamily?: string;
}

export interface Diagnostic {
  readonly severity: DiagnosticSeverity;
  readonly category: DiagnosticCategory;
  readonly message: string;
  readonly path?: string;
  readonly review?: ReviewDiagnosticDetail;
}

export type SurfaceOwnerKind = 'structural_owner' | 'owned_region' | 'parent_surface';

export interface SurfaceOwnerRef {
  readonly kind: SurfaceOwnerKind;
  readonly address: string;
}

export interface SurfaceSpan {
  readonly startLine: number;
  readonly endLine: number;
}

export interface DiscoveredSurface {
  readonly surfaceKind: string;
  readonly declaredLanguage?: string;
  readonly effectiveLanguage: string;
  readonly address: string;
  readonly parentAddress?: string;
  readonly span?: SurfaceSpan;
  readonly owner: SurfaceOwnerRef;
  readonly reconstructionStrategy: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface DelegatedChildOperation {
  readonly operationId: string;
  readonly parentOperationId: string;
  readonly requestedStrategy: 'delegate_child_surface';
  readonly languageChain: readonly string[];
  readonly surface: DiscoveredSurface;
}

export interface ProjectedChildReviewCase {
  readonly caseId: string;
  readonly parentOperationId: string;
  readonly childOperationId: string;
  readonly surfacePath: string;
  readonly delegatedCaseId: string;
  readonly delegatedApplyGroup: string;
  readonly delegatedRuntimeSurfacePath: string;
}

export interface ProjectedChildReviewGroup {
  readonly delegatedApplyGroup: string;
  readonly parentOperationId: string;
  readonly childOperationId: string;
  readonly delegatedRuntimeSurfacePath: string;
  readonly caseIds: readonly string[];
  readonly delegatedCaseIds: readonly string[];
}

export interface ProjectedChildReviewGroupProgress {
  readonly delegatedApplyGroup: string;
  readonly parentOperationId: string;
  readonly childOperationId: string;
  readonly delegatedRuntimeSurfacePath: string;
  readonly resolvedCaseIds: readonly string[];
  readonly pendingCaseIds: readonly string[];
  readonly complete: boolean;
}

export interface ParseResult<TAnalysis> {
  readonly ok: boolean;
  readonly diagnostics: readonly Diagnostic[];
  readonly analysis?: TAnalysis;
  readonly policies?: readonly PolicyReference[];
}

export interface MergeResult<TOutput> {
  readonly ok: boolean;
  readonly diagnostics: readonly Diagnostic[];
  readonly output?: TOutput;
  readonly policies?: readonly PolicyReference[];
}

export type PolicySurface = 'fallback' | 'array';

export interface PolicyReference {
  readonly surface: PolicySurface;
  readonly name: string;
}

export interface FamilyFeatureProfile {
  readonly family: string;
  readonly supportedDialects: readonly string[];
  readonly supportedPolicies: readonly PolicyReference[];
}

export interface StructuredEditStructureProfile {
  readonly ownerScope: string;
  readonly ownerSelector: string;
  readonly ownerSelectorFamily?: string;
  readonly knownOwnerSelector: boolean;
  readonly supportedCommentRegions: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditSelectionProfile {
  readonly ownerScope: string;
  readonly ownerSelector: string;
  readonly ownerSelectorFamily?: string;
  readonly selectorKind: string;
  readonly selectionIntent: string;
  readonly selectionIntentFamily?: string;
  readonly knownSelectionIntent: boolean;
  readonly commentRegion?: string;
  readonly includeTrailingGap: boolean;
  readonly commentAnchored: boolean;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditMatchProfile {
  readonly startBoundary: string;
  readonly startBoundaryFamily?: string;
  readonly knownStartBoundary: boolean;
  readonly endBoundary: string;
  readonly endBoundaryFamily?: string;
  readonly knownEndBoundary: boolean;
  readonly payloadKind: string;
  readonly payloadFamily?: string;
  readonly knownPayloadKind: boolean;
  readonly commentAnchored: boolean;
  readonly trailingGapExtended: boolean;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditOperationProfile {
  readonly operationKind: string;
  readonly operationFamily?: string;
  readonly knownOperationKind: boolean;
  readonly sourceRequirement: string;
  readonly destinationRequirement: string;
  readonly replacementSource: string;
  readonly capturesSourceText: boolean;
  readonly supportsIfMissing: boolean;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditDestinationProfile {
  readonly resolutionKind: string;
  readonly resolutionSource: string;
  readonly anchorBoundary: string;
  readonly resolutionFamily: string;
  readonly resolutionSourceFamily: string;
  readonly anchorBoundaryFamily: string;
  readonly knownResolutionKind: boolean;
  readonly knownResolutionSource: boolean;
  readonly knownAnchorBoundary: boolean;
  readonly usedIfMissing: boolean;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditRequest {
  readonly operationKind: string;
  readonly content: string;
  readonly sourceLabel: string;
  readonly targetSelector?: string;
  readonly targetSelectorFamily?: string;
  readonly destinationSelector?: string;
  readonly destinationSelectorFamily?: string;
  readonly payloadText?: string;
  readonly ifMissing?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditResult {
  readonly operationKind: string;
  readonly updatedContent: string;
  readonly changed: boolean;
  readonly capturedText?: string;
  readonly matchCount?: number;
  readonly operationProfile: StructuredEditOperationProfile;
  readonly destinationProfile?: StructuredEditDestinationProfile;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditApplication {
  readonly request: StructuredEditRequest;
  readonly result: StructuredEditResult;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export const STRUCTURED_EDIT_TRANSPORT_VERSION = 1;

export type StructuredEditTransportImportErrorCategory = 'kind_mismatch' | 'unsupported_version';

export interface StructuredEditTransportImportError {
  readonly category: StructuredEditTransportImportErrorCategory;
  readonly message: string;
}

export interface StructuredEditApplicationEnvelope {
  readonly kind: 'structured_edit_application';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly application: StructuredEditApplication;
}

export interface StructuredEditExecutionReport {
  readonly application: StructuredEditApplication;
  readonly providerFamily: string;
  readonly providerBackend?: string;
  readonly diagnostics: readonly Diagnostic[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderExecutionRequest {
  readonly request: StructuredEditRequest;
  readonly providerFamily: string;
  readonly providerBackend?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderExecutionRequestEnvelope {
  readonly kind: 'structured_edit_provider_execution_request';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly executionRequest: StructuredEditProviderExecutionRequest;
}

export interface StructuredEditProviderExecutionPlan {
  readonly executionRequest: StructuredEditProviderExecutionRequest;
  readonly executorResolution: StructuredEditProviderExecutorResolution;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderExecutionPlanEnvelope {
  readonly kind: 'structured_edit_provider_execution_plan';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly executionPlan: StructuredEditProviderExecutionPlan;
}

export interface StructuredEditProviderExecutionHandoff {
  readonly executionPlan: StructuredEditProviderExecutionPlan;
  readonly executionDispatch: StructuredEditProviderExecutionDispatch;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderExecutionHandoffEnvelope {
  readonly kind: 'structured_edit_provider_execution_handoff';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly executionHandoff: StructuredEditProviderExecutionHandoff;
}

export interface StructuredEditProviderExecutionInvocation {
  readonly executionHandoff: StructuredEditProviderExecutionHandoff;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderExecutionInvocationEnvelope {
  readonly kind: 'structured_edit_provider_execution_invocation';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly executionInvocation: StructuredEditProviderExecutionInvocation;
}

export interface StructuredEditProviderBatchExecutionInvocation {
  readonly invocations: readonly StructuredEditProviderExecutionInvocation[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderBatchExecutionInvocationEnvelope {
  readonly kind: 'structured_edit_provider_batch_execution_invocation';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly batchExecutionInvocation: StructuredEditProviderBatchExecutionInvocation;
}

export interface StructuredEditProviderExecutionRunResult {
  readonly executionInvocation: StructuredEditProviderExecutionInvocation;
  readonly outcome: StructuredEditProviderExecutionOutcome;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderExecutionRunResultEnvelope {
  readonly kind: 'structured_edit_provider_execution_run_result';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly executionRunResult: StructuredEditProviderExecutionRunResult;
}

export interface StructuredEditProviderBatchExecutionRunResult {
  readonly runResults: readonly StructuredEditProviderExecutionRunResult[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderBatchExecutionRunResultEnvelope {
  readonly kind: 'structured_edit_provider_batch_execution_run_result';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly batchExecutionRunResult: StructuredEditProviderBatchExecutionRunResult;
}

export interface StructuredEditProviderExecutionReceipt {
  readonly runResult: StructuredEditProviderExecutionRunResult;
  readonly provenance?: StructuredEditProviderExecutionProvenance;
  readonly replayBundle?: StructuredEditProviderExecutionReplayBundle;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderExecutionReceiptEnvelope {
  readonly kind: 'structured_edit_provider_execution_receipt';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly executionReceipt: StructuredEditProviderExecutionReceipt;
}

export interface StructuredEditProviderBatchExecutionReceipt {
  readonly receipts: readonly StructuredEditProviderExecutionReceipt[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderBatchExecutionReceiptEnvelope {
  readonly kind: 'structured_edit_provider_batch_execution_receipt';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly batchExecutionReceipt: StructuredEditProviderBatchExecutionReceipt;
}

export interface StructuredEditProviderExecutionReceiptReplayRequest {
  readonly executionReceipt: StructuredEditProviderExecutionReceipt;
  readonly replayMode: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderExecutionReceiptReplayRequestEnvelope {
  readonly kind: 'structured_edit_provider_execution_receipt_replay_request';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly receiptReplayRequest: StructuredEditProviderExecutionReceiptReplayRequest;
}

export interface StructuredEditProviderBatchExecutionReceiptReplayRequest {
  readonly requests: readonly StructuredEditProviderExecutionReceiptReplayRequest[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderBatchExecutionReceiptReplayRequestEnvelope {
  readonly kind: 'structured_edit_provider_batch_execution_receipt_replay_request';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly batchReceiptReplayRequest: StructuredEditProviderBatchExecutionReceiptReplayRequest;
}

export interface StructuredEditProviderExecutionReceiptReplayApplication {
  readonly receiptReplayRequest: StructuredEditProviderExecutionReceiptReplayRequest;
  readonly runResult: StructuredEditProviderExecutionRunResult;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderExecutionReceiptReplayApplicationEnvelope {
  readonly kind: 'structured_edit_provider_execution_receipt_replay_application';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly receiptReplayApplication: StructuredEditProviderExecutionReceiptReplayApplication;
}

export interface StructuredEditProviderBatchExecutionReceiptReplayApplication {
  readonly applications: readonly StructuredEditProviderExecutionReceiptReplayApplication[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderBatchExecutionReceiptReplayApplicationEnvelope {
  readonly kind: 'structured_edit_provider_batch_execution_receipt_replay_application';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly batchReceiptReplayApplication: StructuredEditProviderBatchExecutionReceiptReplayApplication;
}

export interface StructuredEditProviderExecutionReceiptReplaySession {
  readonly receiptReplayApplication: StructuredEditProviderExecutionReceiptReplayApplication;
  readonly executionReceipt: StructuredEditProviderExecutionReceipt;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderExecutionReceiptReplaySessionEnvelope {
  readonly kind: 'structured_edit_provider_execution_receipt_replay_session';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly receiptReplaySession: StructuredEditProviderExecutionReceiptReplaySession;
}

export interface StructuredEditProviderBatchExecutionReceiptReplaySession {
  readonly sessions: readonly StructuredEditProviderExecutionReceiptReplaySession[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderBatchExecutionReceiptReplaySessionEnvelope {
  readonly kind: 'structured_edit_provider_batch_execution_receipt_replay_session';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly batchReceiptReplaySession: StructuredEditProviderBatchExecutionReceiptReplaySession;
}

export interface StructuredEditProviderExecutionReceiptReplayWorkflow {
  readonly receiptReplaySession: StructuredEditProviderExecutionReceiptReplaySession;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderExecutionReceiptReplayWorkflowEnvelope {
  readonly kind: 'structured_edit_provider_execution_receipt_replay_workflow';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly receiptReplayWorkflow: StructuredEditProviderExecutionReceiptReplayWorkflow;
}

export interface StructuredEditProviderBatchExecutionReceiptReplayWorkflow {
  readonly workflows: readonly StructuredEditProviderExecutionReceiptReplayWorkflow[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderBatchExecutionReceiptReplayWorkflowEnvelope {
  readonly kind: 'structured_edit_provider_batch_execution_receipt_replay_workflow';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly batchReceiptReplayWorkflow: StructuredEditProviderBatchExecutionReceiptReplayWorkflow;
}

export interface StructuredEditProviderExecutionReceiptReplayWorkflowResult {
  readonly receiptReplayWorkflow: StructuredEditProviderExecutionReceiptReplayWorkflow;
  readonly receiptReplayApplication: StructuredEditProviderExecutionReceiptReplayApplication;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderExecutionReceiptReplayWorkflowResultEnvelope {
  readonly kind: 'structured_edit_provider_execution_receipt_replay_workflow_result';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly receiptReplayWorkflowResult: StructuredEditProviderExecutionReceiptReplayWorkflowResult;
}

export interface StructuredEditProviderBatchExecutionReceiptReplayWorkflowResult {
  readonly receiptReplayWorkflowResults: readonly StructuredEditProviderExecutionReceiptReplayWorkflowResult[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderExecutionReceiptReplayWorkflowReviewRequest {
  readonly receiptReplayWorkflowResult: StructuredEditProviderExecutionReceiptReplayWorkflowResult;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderExecutionReceiptReplayWorkflowApplyRequest {
  readonly receiptReplayWorkflowReviewRequest: StructuredEditProviderExecutionReceiptReplayWorkflowReviewRequest;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderExecutionReceiptReplayWorkflowApplySession {
  readonly receiptReplayWorkflowApplyRequest: StructuredEditProviderExecutionReceiptReplayWorkflowApplyRequest;
  readonly receiptReplaySession: StructuredEditProviderExecutionReceiptReplaySession;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderExecutionReceiptReplayWorkflowApplyResult {
  readonly receiptReplayWorkflowApplySession: StructuredEditProviderExecutionReceiptReplayWorkflowApplySession;
  readonly receiptReplayWorkflowResult: StructuredEditProviderExecutionReceiptReplayWorkflowResult;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderExecutionReceiptReplayWorkflowApplyDecision {
  readonly receiptReplayWorkflowApplyResult: StructuredEditProviderExecutionReceiptReplayWorkflowApplyResult;
  readonly decision: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderExecutionReceiptReplayWorkflowApplyDecisionOutcome {
  readonly receiptReplayWorkflowApplyDecision: StructuredEditProviderExecutionReceiptReplayWorkflowApplyDecision;
  readonly outcome: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderExecutionReceiptReplayWorkflowApplyDecisionSettlement {
  readonly receiptReplayWorkflowApplyDecisionOutcome: StructuredEditProviderExecutionReceiptReplayWorkflowApplyDecisionOutcome;
  readonly settlement: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderExecutionReceiptReplayWorkflowApplyDecisionEnvelope {
  readonly kind: 'structured_edit_provider_execution_receipt_replay_workflow_apply_decision';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly receiptReplayWorkflowApplyDecision: StructuredEditProviderExecutionReceiptReplayWorkflowApplyDecision;
}

export interface StructuredEditProviderExecutionReceiptReplayWorkflowApplyDecisionOutcomeEnvelope {
  readonly kind: 'structured_edit_provider_execution_receipt_replay_workflow_apply_decision_outcome';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly receiptReplayWorkflowApplyDecisionOutcome: StructuredEditProviderExecutionReceiptReplayWorkflowApplyDecisionOutcome;
}

export interface StructuredEditProviderExecutionReceiptReplayWorkflowApplyResultEnvelope {
  readonly kind: 'structured_edit_provider_execution_receipt_replay_workflow_apply_result';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly receiptReplayWorkflowApplyResult: StructuredEditProviderExecutionReceiptReplayWorkflowApplyResult;
}

export interface StructuredEditProviderExecutionReceiptReplayWorkflowApplySessionEnvelope {
  readonly kind: 'structured_edit_provider_execution_receipt_replay_workflow_apply_session';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly receiptReplayWorkflowApplySession: StructuredEditProviderExecutionReceiptReplayWorkflowApplySession;
}

export interface StructuredEditProviderExecutionReceiptReplayWorkflowApplyRequestEnvelope {
  readonly kind: 'structured_edit_provider_execution_receipt_replay_workflow_apply_request';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly receiptReplayWorkflowApplyRequest: StructuredEditProviderExecutionReceiptReplayWorkflowApplyRequest;
}

export interface StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyRequest {
  readonly applyRequests: readonly StructuredEditProviderExecutionReceiptReplayWorkflowApplyRequest[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplySession {
  readonly applySessions: readonly StructuredEditProviderExecutionReceiptReplayWorkflowApplySession[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyResult {
  readonly applyResults: readonly StructuredEditProviderExecutionReceiptReplayWorkflowApplyResult[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyDecision {
  readonly applyDecisions: readonly StructuredEditProviderExecutionReceiptReplayWorkflowApplyDecision[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyDecisionOutcome {
  readonly applyDecisionOutcomes: readonly StructuredEditProviderExecutionReceiptReplayWorkflowApplyDecisionOutcome[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyRequestEnvelope {
  readonly kind: 'structured_edit_provider_batch_execution_receipt_replay_workflow_apply_request';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly batchReceiptReplayWorkflowApplyRequest: StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyRequest;
}

export interface StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplySessionEnvelope {
  readonly kind: 'structured_edit_provider_batch_execution_receipt_replay_workflow_apply_session';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly batchReceiptReplayWorkflowApplySession: StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplySession;
}

export interface StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyResultEnvelope {
  readonly kind: 'structured_edit_provider_batch_execution_receipt_replay_workflow_apply_result';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly batchReceiptReplayWorkflowApplyResult: StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyResult;
}

export interface StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyDecisionEnvelope {
  readonly kind: 'structured_edit_provider_batch_execution_receipt_replay_workflow_apply_decision';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly batchReceiptReplayWorkflowApplyDecision: StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyDecision;
}

export interface StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyDecisionOutcomeEnvelope {
  readonly kind: 'structured_edit_provider_batch_execution_receipt_replay_workflow_apply_decision_outcome';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly batchReceiptReplayWorkflowApplyDecisionOutcome: StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyDecisionOutcome;
}

export interface StructuredEditProviderExecutionReceiptReplayWorkflowReviewRequestEnvelope {
  readonly kind: 'structured_edit_provider_execution_receipt_replay_workflow_review_request';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly receiptReplayWorkflowReviewRequest: StructuredEditProviderExecutionReceiptReplayWorkflowReviewRequest;
}

export interface StructuredEditProviderBatchExecutionReceiptReplayWorkflowReviewRequest {
  readonly reviewRequests: readonly StructuredEditProviderExecutionReceiptReplayWorkflowReviewRequest[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderBatchExecutionReceiptReplayWorkflowReviewRequestEnvelope {
  readonly kind: 'structured_edit_provider_batch_execution_receipt_replay_workflow_review_request';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly batchReceiptReplayWorkflowReviewRequest: StructuredEditProviderBatchExecutionReceiptReplayWorkflowReviewRequest;
}

export interface StructuredEditProviderBatchExecutionReceiptReplayWorkflowResultEnvelope {
  readonly kind: 'structured_edit_provider_batch_execution_receipt_replay_workflow_result';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly batchReceiptReplayWorkflowResult: StructuredEditProviderBatchExecutionReceiptReplayWorkflowResult;
}

export interface StructuredEditProviderBatchExecutionHandoff {
  readonly handoffs: readonly StructuredEditProviderExecutionHandoff[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderBatchExecutionHandoffEnvelope {
  readonly kind: 'structured_edit_provider_batch_execution_handoff';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly batchExecutionHandoff: StructuredEditProviderBatchExecutionHandoff;
}

export interface StructuredEditProviderBatchExecutionPlan {
  readonly plans: readonly StructuredEditProviderExecutionPlan[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderBatchExecutionPlanEnvelope {
  readonly kind: 'structured_edit_provider_batch_execution_plan';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly batchExecutionPlan: StructuredEditProviderBatchExecutionPlan;
}

export interface StructuredEditProviderExecutionApplication {
  readonly executionRequest: StructuredEditProviderExecutionRequest;
  readonly report: StructuredEditExecutionReport;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderExecutionDispatch {
  readonly executionRequest: StructuredEditProviderExecutionRequest;
  readonly resolvedProviderFamily: string;
  readonly resolvedProviderBackend: string;
  readonly executorLabel?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderExecutionDispatchEnvelope {
  readonly kind: 'structured_edit_provider_execution_dispatch';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly providerExecutionDispatch: StructuredEditProviderExecutionDispatch;
}

export interface StructuredEditProviderExecutionOutcome {
  readonly dispatch: StructuredEditProviderExecutionDispatch;
  readonly application: StructuredEditProviderExecutionApplication;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderExecutionOutcomeEnvelope {
  readonly kind: 'structured_edit_provider_execution_outcome';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly providerExecutionOutcome: StructuredEditProviderExecutionOutcome;
}

export interface StructuredEditProviderBatchExecutionOutcome {
  readonly outcomes: readonly StructuredEditProviderExecutionOutcome[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderBatchExecutionOutcomeEnvelope {
  readonly kind: 'structured_edit_provider_batch_execution_outcome';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly batchOutcome: StructuredEditProviderBatchExecutionOutcome;
}

export interface StructuredEditProviderExecutionProvenance {
  readonly dispatch: StructuredEditProviderExecutionDispatch;
  readonly outcome: StructuredEditProviderExecutionOutcome;
  readonly diagnostics: readonly Diagnostic[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderExecutionProvenanceEnvelope {
  readonly kind: 'structured_edit_provider_execution_provenance';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly provenance: StructuredEditProviderExecutionProvenance;
}

export interface StructuredEditProviderBatchExecutionProvenance {
  readonly provenances: readonly StructuredEditProviderExecutionProvenance[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderBatchExecutionProvenanceEnvelope {
  readonly kind: 'structured_edit_provider_batch_execution_provenance';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly batchProvenance: StructuredEditProviderBatchExecutionProvenance;
}

export interface StructuredEditProviderExecutionReplayBundle {
  readonly executionRequest: StructuredEditProviderExecutionRequest;
  readonly provenance: StructuredEditProviderExecutionProvenance;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderExecutionReplayBundleEnvelope {
  readonly kind: 'structured_edit_provider_execution_replay_bundle';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly replayBundle: StructuredEditProviderExecutionReplayBundle;
}

export interface StructuredEditProviderBatchExecutionReplayBundle {
  readonly replayBundles: readonly StructuredEditProviderExecutionReplayBundle[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderBatchExecutionReplayBundleEnvelope {
  readonly kind: 'structured_edit_provider_batch_execution_replay_bundle';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly batchReplayBundle: StructuredEditProviderBatchExecutionReplayBundle;
}

export interface StructuredEditProviderExecutorProfile {
  readonly providerFamily: string;
  readonly providerBackend: string;
  readonly executorLabel: string;
  readonly structureProfile: StructuredEditStructureProfile;
  readonly selectionProfile: StructuredEditSelectionProfile;
  readonly matchProfile: StructuredEditMatchProfile;
  readonly operationProfiles: readonly StructuredEditOperationProfile[];
  readonly destinationProfile: StructuredEditDestinationProfile;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderExecutorProfileEnvelope {
  readonly kind: 'structured_edit_provider_executor_profile';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly executorProfile: StructuredEditProviderExecutorProfile;
}

export interface StructuredEditProviderExecutorRegistry {
  readonly executorProfiles: readonly StructuredEditProviderExecutorProfile[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderExecutorRegistryEnvelope {
  readonly kind: 'structured_edit_provider_executor_registry';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly executorRegistry: StructuredEditProviderExecutorRegistry;
}

export interface StructuredEditProviderExecutorSelectionPolicy {
  readonly providerFamily: string;
  readonly providerBackend?: string;
  readonly executorLabel?: string;
  readonly selectionMode: string;
  readonly allowRegistryFallback: boolean;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderExecutorSelectionPolicyEnvelope {
  readonly kind: 'structured_edit_provider_executor_selection_policy';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly selectionPolicy: StructuredEditProviderExecutorSelectionPolicy;
}

export interface StructuredEditProviderExecutorResolution {
  readonly executorRegistry: StructuredEditProviderExecutorRegistry;
  readonly selectionPolicy: StructuredEditProviderExecutorSelectionPolicy;
  readonly selectedExecutorProfile: StructuredEditProviderExecutorProfile;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderExecutorResolutionEnvelope {
  readonly kind: 'structured_edit_provider_executor_resolution';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly executorResolution: StructuredEditProviderExecutorResolution;
}

export interface StructuredEditProviderExecutionApplicationEnvelope {
  readonly kind: 'structured_edit_provider_execution_application';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly providerExecutionApplication: StructuredEditProviderExecutionApplication;
}

export interface StructuredEditExecutionReportEnvelope {
  readonly kind: 'structured_edit_execution_report';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly report: StructuredEditExecutionReport;
}

export interface StructuredEditBatchRequest {
  readonly requests: readonly StructuredEditRequest[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderBatchExecutionRequest {
  readonly requests: readonly StructuredEditProviderExecutionRequest[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderBatchExecutionRequestEnvelope {
  readonly kind: 'structured_edit_provider_batch_execution_request';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly batchExecutionRequest: StructuredEditProviderBatchExecutionRequest;
}

export interface StructuredEditProviderBatchExecutionDispatch {
  readonly dispatches: readonly StructuredEditProviderExecutionDispatch[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderBatchExecutionDispatchEnvelope {
  readonly kind: 'structured_edit_provider_batch_execution_dispatch';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly batchDispatch: StructuredEditProviderBatchExecutionDispatch;
}

export interface StructuredEditProviderBatchExecutionReport {
  readonly applications: readonly StructuredEditProviderExecutionApplication[];
  readonly diagnostics: readonly Diagnostic[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditProviderBatchExecutionReportEnvelope {
  readonly kind: 'structured_edit_provider_batch_execution_report';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly batchReport: StructuredEditProviderBatchExecutionReport;
}

export interface StructuredEditBatchReport {
  readonly reports: readonly StructuredEditExecutionReport[];
  readonly diagnostics: readonly Diagnostic[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StructuredEditBatchReportEnvelope {
  readonly kind: 'structured_edit_batch_report';
  readonly version: typeof STRUCTURED_EDIT_TRANSPORT_VERSION;
  readonly batchReport: StructuredEditBatchReport;
}

export interface TemplateTargetClassification {
  readonly destinationPath: string;
  readonly fileType: string;
  readonly family: string;
  readonly dialect: string;
}

export interface TemplateDestinationContext {
  readonly projectName?: string;
}

export interface TemplateTokenConfig {
  readonly pre: string;
  readonly post: string;
  readonly separators: readonly string[];
  readonly minSegments: number;
  readonly maxSegments?: number;
  readonly segmentPattern: string;
}

export type TemplateStrategy = 'merge' | 'accept_template' | 'keep_destination' | 'raw_copy';

export interface TemplateStrategyOverride {
  readonly path: string;
  readonly strategy: TemplateStrategy;
}

export interface TemplatePlanEntry {
  readonly templateSourcePath: string;
  readonly logicalDestinationPath: string;
  readonly destinationPath?: string;
  readonly classification: TemplateTargetClassification;
  readonly strategy: TemplateStrategy;
  readonly action: 'omit' | TemplateStrategy;
}

export interface TemplatePlanStateEntry extends TemplatePlanEntry {
  readonly destinationExists: boolean;
  readonly writeAction: 'omit' | 'keep' | 'create' | 'update';
}

export type TemplatePlanBlockReason = 'unresolved_tokens';

export interface TemplatePlanTokenStateEntry extends TemplatePlanStateEntry {
  readonly tokenKeys: readonly string[];
  readonly unresolvedTokenKeys: readonly string[];
  readonly tokenResolutionRequired: boolean;
  readonly blocked: boolean;
  readonly blockReason?: TemplatePlanBlockReason;
}

export type TemplatePreparationAction = 'blocked' | 'resolve_tokens' | 'pass_through';

export interface TemplatePreparedEntry extends TemplatePlanTokenStateEntry {
  readonly templateContent: string;
  readonly preparedTemplateContent?: string;
  readonly preparationAction: TemplatePreparationAction;
}

export type TemplateExecutionAction =
  | 'blocked'
  | 'omit'
  | 'keep'
  | 'raw_copy'
  | 'write_prepared_content'
  | 'merge_prepared_content';

export interface TemplateExecutionPlanEntry extends TemplatePreparedEntry {
  readonly executionAction: TemplateExecutionAction;
  readonly ready: boolean;
  readonly destinationContent?: string;
}

export interface TemplatePreviewResult {
  readonly resultFiles: Readonly<Record<string, string>>;
  readonly createdPaths: readonly string[];
  readonly updatedPaths: readonly string[];
  readonly keptPaths: readonly string[];
  readonly blockedPaths: readonly string[];
  readonly omittedPaths: readonly string[];
}

export interface TemplateApplyResult extends TemplatePreviewResult {
  readonly diagnostics: readonly Diagnostic[];
}

export interface TemplateConvergenceResult {
  readonly converged: boolean;
  readonly pendingPaths: readonly string[];
}

export interface TemplateTreeRunResult {
  readonly executionPlan: readonly TemplateExecutionPlanEntry[];
  readonly applyResult: TemplateApplyResult;
}

export type TemplateTreeRunStatus = 'created' | 'updated' | 'kept' | 'blocked' | 'omitted';

export interface TemplateTreeRunReportEntry {
  readonly templateSourcePath: string;
  readonly logicalDestinationPath: string;
  readonly destinationPath?: string;
  readonly executionAction: TemplateExecutionAction;
  readonly status: TemplateTreeRunStatus;
}

export interface TemplateTreeRunReport {
  readonly entries: readonly TemplateTreeRunReportEntry[];
  readonly summary: Readonly<{
    created: number;
    updated: number;
    kept: number;
    blocked: number;
    omitted: number;
  }>;
}

export interface TemplateDirectoryApplyReportEntry {
  readonly templateSourcePath: string;
  readonly logicalDestinationPath: string;
  readonly destinationPath?: string;
  readonly executionAction: TemplateExecutionAction;
  readonly status: TemplateTreeRunStatus;
  readonly written: boolean;
}

export interface TemplateDirectoryApplyReport {
  readonly entries: readonly TemplateDirectoryApplyReportEntry[];
  readonly summary: Readonly<{
    created: number;
    updated: number;
    kept: number;
    blocked: number;
    omitted: number;
    written: number;
  }>;
}

export type TemplateDirectoryPlanStatus = 'create' | 'update' | 'keep' | 'blocked' | 'omitted';

export interface TemplateDirectoryPlanReportEntry {
  readonly templateSourcePath: string;
  readonly logicalDestinationPath: string;
  readonly destinationPath?: string;
  readonly executionAction: TemplateExecutionAction;
  readonly writeAction: string;
  readonly status: TemplateDirectoryPlanStatus;
  readonly previewable: boolean;
}

export interface TemplateDirectoryPlanReport {
  readonly entries: readonly TemplateDirectoryPlanReportEntry[];
  readonly summary: Readonly<{
    create: number;
    update: number;
    keep: number;
    blocked: number;
    omitted: number;
  }>;
}

export interface TemplateDirectoryRunnerReport {
  readonly planReport: TemplateDirectoryPlanReport;
  readonly preview?: TemplatePreviewResult;
  readonly runReport?: TemplateTreeRunReport;
  readonly applyReport?: TemplateDirectoryApplyReport;
}

export type ConformanceOutcome = 'passed' | 'failed' | 'skipped';

export interface ConformanceCaseRef {
  readonly family: string;
  readonly role: string;
  readonly case: string;
}

export interface ConformanceCaseResult {
  readonly ref: ConformanceCaseRef;
  readonly outcome: ConformanceOutcome;
  readonly messages: readonly string[];
}

export interface ConformanceCaseRequirements {
  readonly backend?: string;
  readonly dialect?: string;
  readonly policies?: readonly PolicyReference[];
}

export type ConformanceSelectionStatus = 'selected' | 'skipped';

export interface ConformanceCaseSelection {
  readonly ref: ConformanceCaseRef;
  readonly status: ConformanceSelectionStatus;
  readonly messages: readonly string[];
}

export interface ConformanceFeatureProfileView {
  readonly backend: string;
  readonly supportsDialects: boolean;
  readonly supportedPolicies?: readonly PolicyReference[];
}

export interface ConformanceCaseRun {
  readonly ref: ConformanceCaseRef;
  readonly requirements: ConformanceCaseRequirements;
  readonly familyProfile: FamilyFeatureProfile;
  readonly featureProfile?: ConformanceFeatureProfileView;
}

export interface ConformanceCaseExecution {
  readonly outcome: Exclude<ConformanceOutcome, 'skipped'>;
  readonly messages: readonly string[];
}

export interface ConformanceManifestEntry {
  readonly role: string;
  readonly path: readonly string[];
  readonly requirements?: ConformanceCaseRequirements;
}

export interface ConformanceFamilyFeatureProfileEntry extends ConformanceManifestEntry {
  readonly family: string;
}

export interface ConformanceManifest {
  readonly family_feature_profiles: readonly ConformanceFamilyFeatureProfileEntry[];
  readonly suite_descriptors?: readonly ConformanceSuiteDefinition[];
  readonly families: Readonly<Record<string, readonly ConformanceManifestEntry[]>>;
}

export interface ConformanceSuiteSubject {
  readonly grammar: string;
  readonly variant?: string;
}

export interface ConformanceSuiteSelector {
  readonly kind: string;
  readonly subject: ConformanceSuiteSubject;
}

export interface ConformanceSuiteDefinition {
  readonly kind: string;
  readonly subject: ConformanceSuiteSubject;
  readonly roles: readonly string[];
}

export interface NamedConformanceSuiteReport {
  readonly suite: ConformanceSuiteDefinition;
  readonly report: ConformanceSuiteReport;
}

export interface ConformanceFamilyPlanContext {
  readonly familyProfile: FamilyFeatureProfile;
  readonly featureProfile?: ConformanceFeatureProfileView;
}

export interface NamedConformanceSuitePlan {
  readonly suite: ConformanceSuiteDefinition;
  readonly plan: ConformanceSuitePlan;
}

export interface NamedConformanceSuiteResults {
  readonly suite: ConformanceSuiteDefinition;
  readonly results: readonly ConformanceCaseResult[];
}

export interface NamedConformanceSuiteReportEnvelope {
  readonly entries: readonly NamedConformanceSuiteReport[];
  readonly summary: ConformanceSuiteSummary;
}

export interface ConformanceManifestPlanningOptions {
  readonly contexts?: Readonly<Record<string, ConformanceFamilyPlanContext>>;
  readonly familyProfiles?: Readonly<Record<string, FamilyFeatureProfile>>;
  readonly requireExplicitContexts?: boolean;
}

export interface ConformanceManifestReport {
  readonly report: NamedConformanceSuiteReportEnvelope;
  readonly diagnostics: readonly Diagnostic[];
}

export type ReviewRequestKind = 'family_context' | 'delegated_child_group';

export type ReviewDecisionAction =
  | 'accept_default_context'
  | 'provide_explicit_context'
  | 'apply_delegated_child_group';

export interface ReviewActionOffer {
  readonly action: ReviewDecisionAction;
  readonly requiresContext: boolean;
  readonly payloadKind?: 'conformance_family_context';
}

export interface ReviewRequest {
  readonly id: string;
  readonly kind: ReviewRequestKind;
  readonly family: string;
  readonly message: string;
  readonly blocking: boolean;
  readonly proposedContext?: ConformanceFamilyPlanContext;
  readonly delegatedGroup?: ProjectedChildReviewGroup;
  readonly actionOffers: readonly ReviewActionOffer[];
  readonly defaultAction?: ReviewDecisionAction;
}

export interface ReviewDecision {
  readonly requestId: string;
  readonly action: ReviewDecisionAction;
  readonly context?: ConformanceFamilyPlanContext;
}

export interface DelegatedChildGroupReviewState {
  readonly requests: readonly ReviewRequest[];
  readonly acceptedGroups: readonly ProjectedChildReviewGroup[];
  readonly appliedDecisions: readonly ReviewDecision[];
  readonly diagnostics: readonly Diagnostic[];
}

export interface DelegatedChildApplyPlanEntry {
  readonly requestId: string;
  readonly family: string;
  readonly delegatedGroup: ProjectedChildReviewGroup;
  readonly decision: ReviewDecision;
}

export interface DelegatedChildApplyPlan {
  readonly entries: readonly DelegatedChildApplyPlanEntry[];
}

export interface DelegatedChildSurfaceOutput {
  readonly surfaceAddress: string;
  readonly output: string;
}

export interface AppliedDelegatedChildOutput {
  readonly operationId: string;
  readonly output: string;
}

export interface DelegatedChildOutputResolutionOptions {
  readonly defaultFamily: string;
  readonly requestIdPrefix: string;
}

export interface DelegatedChildOutputResolution {
  readonly ok: boolean;
  readonly diagnostics: readonly Diagnostic[];
  readonly applyPlan?: DelegatedChildApplyPlan;
  readonly appliedChildren?: readonly AppliedDelegatedChildOutput[];
}

export interface NestedMergeDiscoveryResult {
  readonly ok: boolean;
  readonly diagnostics: readonly Diagnostic[];
  readonly operations?: readonly DelegatedChildOperation[];
}

export interface NestedMergeExecutionCallbacks<TOutput> {
  readonly mergeParent: () => MergeResult<TOutput>;
  readonly discoverOperations: (mergedOutput: TOutput) => NestedMergeDiscoveryResult;
  readonly applyResolvedOutputs: (
    mergedOutput: TOutput,
    operations: readonly DelegatedChildOperation[],
    applyPlan: DelegatedChildApplyPlan,
    appliedChildren: readonly AppliedDelegatedChildOutput[]
  ) => MergeResult<TOutput>;
}

export interface ReviewReplayBundle {
  readonly replayContext: ReviewReplayContext;
  readonly decisions: readonly ReviewDecision[];
  readonly reviewedNestedExecutions?: readonly ReviewedNestedExecution[];
}

export const REVIEW_TRANSPORT_VERSION = 1;

export type ReviewTransportImportErrorCategory = 'kind_mismatch' | 'unsupported_version';

export interface ReviewTransportImportError {
  readonly category: ReviewTransportImportErrorCategory;
  readonly message: string;
}

export interface ConformanceManifestReviewStateEnvelope {
  readonly kind: 'conformance_manifest_review_state';
  readonly version: typeof REVIEW_TRANSPORT_VERSION;
  readonly state: ConformanceManifestReviewState;
}

export interface ReviewReplayBundleEnvelope {
  readonly kind: 'review_replay_bundle';
  readonly version: typeof REVIEW_TRANSPORT_VERSION;
  readonly replayBundle: ReviewReplayBundle;
}

export interface ReviewedNestedExecution {
  readonly family: string;
  readonly reviewState: DelegatedChildGroupReviewState;
  readonly appliedChildren: readonly AppliedDelegatedChildOutput[];
}

export interface ReviewedNestedExecutionResult<TOutput> {
  readonly execution: ReviewedNestedExecution;
  readonly result: MergeResult<TOutput>;
}

export interface ReviewedNestedExecutionApplication<TOutput> {
  readonly diagnostics: readonly Diagnostic[];
  readonly results: readonly ReviewedNestedExecutionResult<TOutput>[];
}

export interface ConformanceManifestReviewedNestedApplication<TOutput> {
  readonly state: ConformanceManifestReviewState;
  readonly results: readonly ReviewedNestedExecutionResult<TOutput>[];
}

export interface ReviewedNestedExecutionEnvelope {
  readonly kind: 'reviewed_nested_execution';
  readonly version: typeof REVIEW_TRANSPORT_VERSION;
  readonly execution: ReviewedNestedExecution;
}

export interface ReviewHostHints {
  readonly interactive: boolean;
  readonly requireExplicitContexts: boolean;
}

export interface ReviewReplayContext {
  readonly surface: 'conformance_manifest';
  readonly families: readonly string[];
  readonly requireExplicitContexts: boolean;
}

export interface ConformanceManifestReviewOptions extends ConformanceManifestPlanningOptions {
  readonly reviewDecisions?: readonly ReviewDecision[];
  readonly reviewReplayContext?: ReviewReplayContext;
  readonly reviewReplayBundle?: ReviewReplayBundle;
  readonly interactive?: boolean;
}

export interface ConformanceManifestReviewState {
  readonly report: NamedConformanceSuiteReportEnvelope;
  readonly diagnostics: readonly Diagnostic[];
  readonly requests: readonly ReviewRequest[];
  readonly appliedDecisions: readonly ReviewDecision[];
  readonly hostHints: ReviewHostHints;
  readonly replayContext: ReviewReplayContext;
  readonly reviewedNestedExecutions?: readonly ReviewedNestedExecution[];
}

export interface ConformanceSuiteSummary {
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
}

export interface ConformanceSuiteReport {
  readonly results: readonly ConformanceCaseResult[];
  readonly summary: ConformanceSuiteSummary;
}

export interface ConformanceSuitePlanEntry {
  readonly ref: ConformanceCaseRef;
  readonly path: readonly string[];
  readonly run: ConformanceCaseRun;
}

export interface ConformanceSuitePlan {
  readonly family: string;
  readonly entries: readonly ConformanceSuitePlanEntry[];
  readonly missingRoles: readonly string[];
}

function includesPolicy(
  supportedPolicies: readonly PolicyReference[],
  policy: PolicyReference
): boolean {
  return supportedPolicies.some(
    (supportedPolicy) =>
      supportedPolicy.surface === policy.surface && supportedPolicy.name === policy.name
  );
}

function isDefaultDialect(familyProfile: FamilyFeatureProfile, dialect: string): boolean {
  return dialect === familyProfile.family;
}

export function conformanceFamilyEntries(
  manifest: ConformanceManifest,
  family: string
): readonly ConformanceManifestEntry[] {
  return manifest.families[family] ?? [];
}

export function conformanceFixturePath(
  manifest: ConformanceManifest,
  family: string,
  role: string
): readonly string[] | undefined {
  return conformanceFamilyEntries(manifest, family).find((entry) => entry.role === role)?.path;
}

export function conformanceFamilyFeatureProfilePath(
  manifest: ConformanceManifest,
  family: string
): readonly string[] | undefined {
  return manifest.family_feature_profiles.find((entry) => entry.family === family)?.path;
}

export function normalizeTemplateSourcePath(path: string): string {
  if (path.endsWith('.no-osc.example')) {
    return path.slice(0, -'.no-osc.example'.length);
  }

  if (path.endsWith('.example')) {
    return path.slice(0, -'.example'.length);
  }

  return path;
}

export function structuredEditApplicationEnvelope(
  application: StructuredEditApplication
): StructuredEditApplicationEnvelope {
  return {
    kind: 'structured_edit_application',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    application
  };
}

export function importStructuredEditApplicationEnvelope(value: unknown): {
  application?: StructuredEditApplication;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'structured_edit_application'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_application envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    application: StructuredEditApplication;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_application envelope version ${String(envelope.version)}.`
      }
    };
  }

  return { application: envelope.application };
}

export function structuredEditProviderExecutionRequestEnvelope(
  executionRequest: StructuredEditProviderExecutionRequest
): StructuredEditProviderExecutionRequestEnvelope {
  return {
    kind: 'structured_edit_provider_execution_request',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    executionRequest
  };
}

export function importStructuredEditProviderExecutionRequestEnvelope(value: unknown): {
  executionRequest?: StructuredEditProviderExecutionRequest;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'structured_edit_provider_execution_request'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_provider_execution_request envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    executionRequest?: StructuredEditProviderExecutionRequest;
    execution_request?: StructuredEditProviderExecutionRequest;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_execution_request envelope version ${String(envelope.version)}.`
      }
    };
  }

  return { executionRequest: envelope.executionRequest ?? envelope.execution_request };
}

export function structuredEditProviderExecutionPlanEnvelope(
  executionPlan: StructuredEditProviderExecutionPlan
): StructuredEditProviderExecutionPlanEnvelope {
  return {
    kind: 'structured_edit_provider_execution_plan',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    executionPlan
  };
}

export function importStructuredEditProviderExecutionPlanEnvelope(value: unknown): {
  executionPlan?: StructuredEditProviderExecutionPlan;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'structured_edit_provider_execution_plan'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_provider_execution_plan envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    executionPlan?: StructuredEditProviderExecutionPlan;
    execution_plan?: StructuredEditProviderExecutionPlan;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_execution_plan envelope version ${String(envelope.version)}.`
      }
    };
  }

  return { executionPlan: envelope.executionPlan ?? envelope.execution_plan };
}

export function structuredEditProviderExecutionHandoffEnvelope(
  executionHandoff: StructuredEditProviderExecutionHandoff
): StructuredEditProviderExecutionHandoffEnvelope {
  return {
    kind: 'structured_edit_provider_execution_handoff',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    executionHandoff
  };
}

export function importStructuredEditProviderExecutionHandoffEnvelope(value: unknown): {
  executionHandoff?: StructuredEditProviderExecutionHandoff;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'structured_edit_provider_execution_handoff'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_provider_execution_handoff envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    executionHandoff?: StructuredEditProviderExecutionHandoff;
    execution_handoff?: StructuredEditProviderExecutionHandoff;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_execution_handoff envelope version ${String(envelope.version)}.`
      }
    };
  }

  return { executionHandoff: envelope.executionHandoff ?? envelope.execution_handoff };
}

export function structuredEditProviderExecutionInvocationEnvelope(
  executionInvocation: StructuredEditProviderExecutionInvocation
): StructuredEditProviderExecutionInvocationEnvelope {
  return {
    kind: 'structured_edit_provider_execution_invocation',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    executionInvocation
  };
}

export function importStructuredEditProviderExecutionInvocationEnvelope(value: unknown): {
  executionInvocation?: StructuredEditProviderExecutionInvocation;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'structured_edit_provider_execution_invocation'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_provider_execution_invocation envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    executionInvocation?: StructuredEditProviderExecutionInvocation;
    execution_invocation?: StructuredEditProviderExecutionInvocation;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_execution_invocation envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    executionInvocation: envelope.executionInvocation ?? envelope.execution_invocation
  };
}

export function structuredEditProviderBatchExecutionInvocationEnvelope(
  batchExecutionInvocation: StructuredEditProviderBatchExecutionInvocation
): StructuredEditProviderBatchExecutionInvocationEnvelope {
  return {
    kind: 'structured_edit_provider_batch_execution_invocation',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchExecutionInvocation
  };
}

export function importStructuredEditProviderBatchExecutionInvocationEnvelope(value: unknown): {
  batchExecutionInvocation?: StructuredEditProviderBatchExecutionInvocation;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'structured_edit_provider_batch_execution_invocation'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_provider_batch_execution_invocation envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    batchExecutionInvocation?: StructuredEditProviderBatchExecutionInvocation;
    batch_execution_invocation?: StructuredEditProviderBatchExecutionInvocation;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_batch_execution_invocation envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    batchExecutionInvocation:
      envelope.batchExecutionInvocation ?? envelope.batch_execution_invocation
  };
}

export function structuredEditProviderExecutionRunResultEnvelope(
  executionRunResult: StructuredEditProviderExecutionRunResult
): StructuredEditProviderExecutionRunResultEnvelope {
  return {
    kind: 'structured_edit_provider_execution_run_result',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    executionRunResult
  };
}

export function importStructuredEditProviderExecutionRunResultEnvelope(value: unknown): {
  executionRunResult?: StructuredEditProviderExecutionRunResult;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'structured_edit_provider_execution_run_result'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_provider_execution_run_result envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    executionRunResult?: StructuredEditProviderExecutionRunResult;
    execution_run_result?: StructuredEditProviderExecutionRunResult;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_execution_run_result envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    executionRunResult: envelope.executionRunResult ?? envelope.execution_run_result
  };
}

export function structuredEditProviderBatchExecutionRunResultEnvelope(
  batchExecutionRunResult: StructuredEditProviderBatchExecutionRunResult
): StructuredEditProviderBatchExecutionRunResultEnvelope {
  return {
    kind: 'structured_edit_provider_batch_execution_run_result',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchExecutionRunResult
  };
}

export function importStructuredEditProviderBatchExecutionRunResultEnvelope(value: unknown): {
  batchExecutionRunResult?: StructuredEditProviderBatchExecutionRunResult;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'structured_edit_provider_batch_execution_run_result'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_provider_batch_execution_run_result envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    batchExecutionRunResult?: StructuredEditProviderBatchExecutionRunResult;
    batch_execution_run_result?: StructuredEditProviderBatchExecutionRunResult;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_batch_execution_run_result envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    batchExecutionRunResult: envelope.batchExecutionRunResult ?? envelope.batch_execution_run_result
  };
}

export function structuredEditProviderExecutionReceiptEnvelope(
  executionReceipt: StructuredEditProviderExecutionReceipt
): StructuredEditProviderExecutionReceiptEnvelope {
  return {
    kind: 'structured_edit_provider_execution_receipt',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    executionReceipt
  };
}

export function importStructuredEditProviderExecutionReceiptEnvelope(value: unknown): {
  executionReceipt?: StructuredEditProviderExecutionReceipt;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'structured_edit_provider_execution_receipt'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_provider_execution_receipt envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    executionReceipt?: StructuredEditProviderExecutionReceipt;
    execution_receipt?: StructuredEditProviderExecutionReceipt;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_execution_receipt envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    executionReceipt: envelope.executionReceipt ?? envelope.execution_receipt
  };
}

export function structuredEditProviderBatchExecutionReceiptEnvelope(
  batchExecutionReceipt: StructuredEditProviderBatchExecutionReceipt
): StructuredEditProviderBatchExecutionReceiptEnvelope {
  return {
    kind: 'structured_edit_provider_batch_execution_receipt',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchExecutionReceipt
  };
}

export function importStructuredEditProviderBatchExecutionReceiptEnvelope(value: unknown): {
  batchExecutionReceipt?: StructuredEditProviderBatchExecutionReceipt;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'structured_edit_provider_batch_execution_receipt'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_provider_batch_execution_receipt envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    batchExecutionReceipt?: StructuredEditProviderBatchExecutionReceipt;
    batch_execution_receipt?: StructuredEditProviderBatchExecutionReceipt;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_batch_execution_receipt envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    batchExecutionReceipt: envelope.batchExecutionReceipt ?? envelope.batch_execution_receipt
  };
}

export function structuredEditProviderExecutionReceiptReplayRequestEnvelope(
  receiptReplayRequest: StructuredEditProviderExecutionReceiptReplayRequest
): StructuredEditProviderExecutionReceiptReplayRequestEnvelope {
  return {
    kind: 'structured_edit_provider_execution_receipt_replay_request',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    receiptReplayRequest
  };
}

export function importStructuredEditProviderExecutionReceiptReplayRequestEnvelope(value: unknown): {
  receiptReplayRequest?: StructuredEditProviderExecutionReceiptReplayRequest;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !==
      'structured_edit_provider_execution_receipt_replay_request'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_provider_execution_receipt_replay_request envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    receiptReplayRequest?: StructuredEditProviderExecutionReceiptReplayRequest;
    receipt_replay_request?: StructuredEditProviderExecutionReceiptReplayRequest;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_execution_receipt_replay_request envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    receiptReplayRequest: envelope.receiptReplayRequest ?? envelope.receipt_replay_request
  };
}

export function structuredEditProviderBatchExecutionReceiptReplayRequestEnvelope(
  batchReceiptReplayRequest: StructuredEditProviderBatchExecutionReceiptReplayRequest
): StructuredEditProviderBatchExecutionReceiptReplayRequestEnvelope {
  return {
    kind: 'structured_edit_provider_batch_execution_receipt_replay_request',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchReceiptReplayRequest
  };
}

export function importStructuredEditProviderBatchExecutionReceiptReplayRequestEnvelope(
  value: unknown
): {
  batchReceiptReplayRequest?: StructuredEditProviderBatchExecutionReceiptReplayRequest;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !==
      'structured_edit_provider_batch_execution_receipt_replay_request'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message:
          'expected structured_edit_provider_batch_execution_receipt_replay_request envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    batchReceiptReplayRequest?: StructuredEditProviderBatchExecutionReceiptReplayRequest;
    batch_receipt_replay_request?: StructuredEditProviderBatchExecutionReceiptReplayRequest;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_batch_execution_receipt_replay_request envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    batchReceiptReplayRequest:
      envelope.batchReceiptReplayRequest ?? envelope.batch_receipt_replay_request
  };
}

export function structuredEditProviderExecutionReceiptReplayApplicationEnvelope(
  receiptReplayApplication: StructuredEditProviderExecutionReceiptReplayApplication
): StructuredEditProviderExecutionReceiptReplayApplicationEnvelope {
  return {
    kind: 'structured_edit_provider_execution_receipt_replay_application',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    receiptReplayApplication
  };
}

export function importStructuredEditProviderExecutionReceiptReplayApplicationEnvelope(
  value: unknown
): {
  receiptReplayApplication?: StructuredEditProviderExecutionReceiptReplayApplication;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !==
      'structured_edit_provider_execution_receipt_replay_application'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message:
          'expected structured_edit_provider_execution_receipt_replay_application envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    receiptReplayApplication?: StructuredEditProviderExecutionReceiptReplayApplication;
    receipt_replay_application?: StructuredEditProviderExecutionReceiptReplayApplication;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_execution_receipt_replay_application envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    receiptReplayApplication:
      envelope.receiptReplayApplication ?? envelope.receipt_replay_application
  };
}

export function structuredEditProviderBatchExecutionReceiptReplayApplicationEnvelope(
  batchReceiptReplayApplication: StructuredEditProviderBatchExecutionReceiptReplayApplication
): StructuredEditProviderBatchExecutionReceiptReplayApplicationEnvelope {
  return {
    kind: 'structured_edit_provider_batch_execution_receipt_replay_application',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchReceiptReplayApplication
  };
}

export function importStructuredEditProviderBatchExecutionReceiptReplayApplicationEnvelope(
  value: unknown
): {
  batchReceiptReplayApplication?: StructuredEditProviderBatchExecutionReceiptReplayApplication;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !==
      'structured_edit_provider_batch_execution_receipt_replay_application'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message:
          'expected structured_edit_provider_batch_execution_receipt_replay_application envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    batchReceiptReplayApplication?: StructuredEditProviderBatchExecutionReceiptReplayApplication;
    batch_receipt_replay_application?: StructuredEditProviderBatchExecutionReceiptReplayApplication;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_batch_execution_receipt_replay_application envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    batchReceiptReplayApplication:
      envelope.batchReceiptReplayApplication ?? envelope.batch_receipt_replay_application
  };
}

export function structuredEditProviderExecutionReceiptReplaySessionEnvelope(
  receiptReplaySession: StructuredEditProviderExecutionReceiptReplaySession
): StructuredEditProviderExecutionReceiptReplaySessionEnvelope {
  return {
    kind: 'structured_edit_provider_execution_receipt_replay_session',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    receiptReplaySession
  };
}

export function importStructuredEditProviderExecutionReceiptReplaySessionEnvelope(value: unknown): {
  receiptReplaySession?: StructuredEditProviderExecutionReceiptReplaySession;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !==
      'structured_edit_provider_execution_receipt_replay_session'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_provider_execution_receipt_replay_session envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    receiptReplaySession?: StructuredEditProviderExecutionReceiptReplaySession;
    receipt_replay_session?: StructuredEditProviderExecutionReceiptReplaySession;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_execution_receipt_replay_session envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    receiptReplaySession: envelope.receiptReplaySession ?? envelope.receipt_replay_session
  };
}

export function structuredEditProviderBatchExecutionReceiptReplaySessionEnvelope(
  batchReceiptReplaySession: StructuredEditProviderBatchExecutionReceiptReplaySession
): StructuredEditProviderBatchExecutionReceiptReplaySessionEnvelope {
  return {
    kind: 'structured_edit_provider_batch_execution_receipt_replay_session',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchReceiptReplaySession
  };
}

export function importStructuredEditProviderBatchExecutionReceiptReplaySessionEnvelope(
  value: unknown
): {
  batchReceiptReplaySession?: StructuredEditProviderBatchExecutionReceiptReplaySession;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !==
      'structured_edit_provider_batch_execution_receipt_replay_session'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message:
          'expected structured_edit_provider_batch_execution_receipt_replay_session envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    batchReceiptReplaySession?: StructuredEditProviderBatchExecutionReceiptReplaySession;
    batch_receipt_replay_session?: StructuredEditProviderBatchExecutionReceiptReplaySession;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_batch_execution_receipt_replay_session envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    batchReceiptReplaySession:
      envelope.batchReceiptReplaySession ?? envelope.batch_receipt_replay_session
  };
}

export function structuredEditProviderExecutionReceiptReplayWorkflowEnvelope(
  receiptReplayWorkflow: StructuredEditProviderExecutionReceiptReplayWorkflow
): StructuredEditProviderExecutionReceiptReplayWorkflowEnvelope {
  return {
    kind: 'structured_edit_provider_execution_receipt_replay_workflow',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    receiptReplayWorkflow
  };
}

export function importStructuredEditProviderExecutionReceiptReplayWorkflowEnvelope(
  value: unknown
): {
  receiptReplayWorkflow?: StructuredEditProviderExecutionReceiptReplayWorkflow;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !==
      'structured_edit_provider_execution_receipt_replay_workflow'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message:
          'expected structured_edit_provider_execution_receipt_replay_workflow envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    receiptReplayWorkflow?: StructuredEditProviderExecutionReceiptReplayWorkflow;
    receipt_replay_workflow?: StructuredEditProviderExecutionReceiptReplayWorkflow;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_execution_receipt_replay_workflow envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    receiptReplayWorkflow: envelope.receiptReplayWorkflow ?? envelope.receipt_replay_workflow
  };
}

export function structuredEditProviderBatchExecutionReceiptReplayWorkflowEnvelope(
  batchReceiptReplayWorkflow: StructuredEditProviderBatchExecutionReceiptReplayWorkflow
): StructuredEditProviderBatchExecutionReceiptReplayWorkflowEnvelope {
  return {
    kind: 'structured_edit_provider_batch_execution_receipt_replay_workflow',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchReceiptReplayWorkflow
  };
}

export function importStructuredEditProviderBatchExecutionReceiptReplayWorkflowEnvelope(
  value: unknown
): {
  batchReceiptReplayWorkflow?: StructuredEditProviderBatchExecutionReceiptReplayWorkflow;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !==
      'structured_edit_provider_batch_execution_receipt_replay_workflow'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message:
          'expected structured_edit_provider_batch_execution_receipt_replay_workflow envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    batchReceiptReplayWorkflow?: StructuredEditProviderBatchExecutionReceiptReplayWorkflow;
    batch_receipt_replay_workflow?: StructuredEditProviderBatchExecutionReceiptReplayWorkflow;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_batch_execution_receipt_replay_workflow envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    batchReceiptReplayWorkflow:
      envelope.batchReceiptReplayWorkflow ?? envelope.batch_receipt_replay_workflow
  };
}

export function structuredEditProviderExecutionReceiptReplayWorkflowResultEnvelope(
  receiptReplayWorkflowResult: StructuredEditProviderExecutionReceiptReplayWorkflowResult
): StructuredEditProviderExecutionReceiptReplayWorkflowResultEnvelope {
  return {
    kind: 'structured_edit_provider_execution_receipt_replay_workflow_result',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    receiptReplayWorkflowResult
  };
}

export function importStructuredEditProviderExecutionReceiptReplayWorkflowResultEnvelope(
  value: unknown
): {
  receiptReplayWorkflowResult?: StructuredEditProviderExecutionReceiptReplayWorkflowResult;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !==
      'structured_edit_provider_execution_receipt_replay_workflow_result'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message:
          'expected structured_edit_provider_execution_receipt_replay_workflow_result envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    receiptReplayWorkflowResult?: StructuredEditProviderExecutionReceiptReplayWorkflowResult;
    receipt_replay_workflow_result?: StructuredEditProviderExecutionReceiptReplayWorkflowResult;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_execution_receipt_replay_workflow_result envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    receiptReplayWorkflowResult:
      envelope.receiptReplayWorkflowResult ?? envelope.receipt_replay_workflow_result
  };
}

export function structuredEditProviderBatchExecutionReceiptReplayWorkflowResultEnvelope(
  batchReceiptReplayWorkflowResult: StructuredEditProviderBatchExecutionReceiptReplayWorkflowResult
): StructuredEditProviderBatchExecutionReceiptReplayWorkflowResultEnvelope {
  return {
    kind: 'structured_edit_provider_batch_execution_receipt_replay_workflow_result',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchReceiptReplayWorkflowResult
  };
}

export function importStructuredEditProviderBatchExecutionReceiptReplayWorkflowResultEnvelope(
  value: unknown
): {
  batchReceiptReplayWorkflowResult?: StructuredEditProviderBatchExecutionReceiptReplayWorkflowResult;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !==
      'structured_edit_provider_batch_execution_receipt_replay_workflow_result'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message:
          'expected structured_edit_provider_batch_execution_receipt_replay_workflow_result envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    batchReceiptReplayWorkflowResult?: StructuredEditProviderBatchExecutionReceiptReplayWorkflowResult;
    batch_receipt_replay_workflow_result?: StructuredEditProviderBatchExecutionReceiptReplayWorkflowResult;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_batch_execution_receipt_replay_workflow_result envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    batchReceiptReplayWorkflowResult:
      envelope.batchReceiptReplayWorkflowResult ?? envelope.batch_receipt_replay_workflow_result
  };
}

export function structuredEditProviderExecutionReceiptReplayWorkflowReviewRequestEnvelope(
  receiptReplayWorkflowReviewRequest: StructuredEditProviderExecutionReceiptReplayWorkflowReviewRequest
): StructuredEditProviderExecutionReceiptReplayWorkflowReviewRequestEnvelope {
  return {
    kind: 'structured_edit_provider_execution_receipt_replay_workflow_review_request',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    receiptReplayWorkflowReviewRequest
  };
}

export function importStructuredEditProviderExecutionReceiptReplayWorkflowReviewRequestEnvelope(
  value: unknown
): {
  receiptReplayWorkflowReviewRequest?: StructuredEditProviderExecutionReceiptReplayWorkflowReviewRequest;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !==
      'structured_edit_provider_execution_receipt_replay_workflow_review_request'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message:
          'expected structured_edit_provider_execution_receipt_replay_workflow_review_request envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    receiptReplayWorkflowReviewRequest?: StructuredEditProviderExecutionReceiptReplayWorkflowReviewRequest;
    receipt_replay_workflow_review_request?: StructuredEditProviderExecutionReceiptReplayWorkflowReviewRequest;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_execution_receipt_replay_workflow_review_request envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    receiptReplayWorkflowReviewRequest:
      envelope.receiptReplayWorkflowReviewRequest ?? envelope.receipt_replay_workflow_review_request
  };
}

export function structuredEditProviderExecutionReceiptReplayWorkflowApplyRequestEnvelope(
  receiptReplayWorkflowApplyRequest: StructuredEditProviderExecutionReceiptReplayWorkflowApplyRequest
): StructuredEditProviderExecutionReceiptReplayWorkflowApplyRequestEnvelope {
  return {
    kind: 'structured_edit_provider_execution_receipt_replay_workflow_apply_request',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    receiptReplayWorkflowApplyRequest
  };
}

export function importStructuredEditProviderExecutionReceiptReplayWorkflowApplyRequestEnvelope(
  value: unknown
): {
  receiptReplayWorkflowApplyRequest?: StructuredEditProviderExecutionReceiptReplayWorkflowApplyRequest;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !==
      'structured_edit_provider_execution_receipt_replay_workflow_apply_request'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message:
          'expected structured_edit_provider_execution_receipt_replay_workflow_apply_request envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    receiptReplayWorkflowApplyRequest?: StructuredEditProviderExecutionReceiptReplayWorkflowApplyRequest;
    receipt_replay_workflow_apply_request?: StructuredEditProviderExecutionReceiptReplayWorkflowApplyRequest;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_execution_receipt_replay_workflow_apply_request envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    receiptReplayWorkflowApplyRequest:
      envelope.receiptReplayWorkflowApplyRequest ?? envelope.receipt_replay_workflow_apply_request
  };
}

export function structuredEditProviderExecutionReceiptReplayWorkflowApplySessionEnvelope(
  receiptReplayWorkflowApplySession: StructuredEditProviderExecutionReceiptReplayWorkflowApplySession
): StructuredEditProviderExecutionReceiptReplayWorkflowApplySessionEnvelope {
  return {
    kind: 'structured_edit_provider_execution_receipt_replay_workflow_apply_session',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    receiptReplayWorkflowApplySession
  };
}

export function importStructuredEditProviderExecutionReceiptReplayWorkflowApplySessionEnvelope(
  value: unknown
): {
  receiptReplayWorkflowApplySession?: StructuredEditProviderExecutionReceiptReplayWorkflowApplySession;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !==
      'structured_edit_provider_execution_receipt_replay_workflow_apply_session'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message:
          'expected structured_edit_provider_execution_receipt_replay_workflow_apply_session envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    receiptReplayWorkflowApplySession?: StructuredEditProviderExecutionReceiptReplayWorkflowApplySession;
    receipt_replay_workflow_apply_session?: StructuredEditProviderExecutionReceiptReplayWorkflowApplySession;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_execution_receipt_replay_workflow_apply_session envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    receiptReplayWorkflowApplySession:
      envelope.receiptReplayWorkflowApplySession ?? envelope.receipt_replay_workflow_apply_session
  };
}

export function structuredEditProviderExecutionReceiptReplayWorkflowApplyResultEnvelope(
  receiptReplayWorkflowApplyResult: StructuredEditProviderExecutionReceiptReplayWorkflowApplyResult
): StructuredEditProviderExecutionReceiptReplayWorkflowApplyResultEnvelope {
  return {
    kind: 'structured_edit_provider_execution_receipt_replay_workflow_apply_result',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    receiptReplayWorkflowApplyResult
  };
}

export function importStructuredEditProviderExecutionReceiptReplayWorkflowApplyResultEnvelope(
  value: unknown
): {
  receiptReplayWorkflowApplyResult?: StructuredEditProviderExecutionReceiptReplayWorkflowApplyResult;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !==
      'structured_edit_provider_execution_receipt_replay_workflow_apply_result'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message:
          'expected structured_edit_provider_execution_receipt_replay_workflow_apply_result envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    receiptReplayWorkflowApplyResult?: StructuredEditProviderExecutionReceiptReplayWorkflowApplyResult;
    receipt_replay_workflow_apply_result?: StructuredEditProviderExecutionReceiptReplayWorkflowApplyResult;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_execution_receipt_replay_workflow_apply_result envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    receiptReplayWorkflowApplyResult:
      envelope.receiptReplayWorkflowApplyResult ?? envelope.receipt_replay_workflow_apply_result
  };
}

export function structuredEditProviderExecutionReceiptReplayWorkflowApplyDecisionEnvelope(
  receiptReplayWorkflowApplyDecision: StructuredEditProviderExecutionReceiptReplayWorkflowApplyDecision
): StructuredEditProviderExecutionReceiptReplayWorkflowApplyDecisionEnvelope {
  return {
    kind: 'structured_edit_provider_execution_receipt_replay_workflow_apply_decision',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    receiptReplayWorkflowApplyDecision
  };
}

export function importStructuredEditProviderExecutionReceiptReplayWorkflowApplyDecisionEnvelope(
  value: unknown
): {
  receiptReplayWorkflowApplyDecision?: StructuredEditProviderExecutionReceiptReplayWorkflowApplyDecision;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !==
      'structured_edit_provider_execution_receipt_replay_workflow_apply_decision'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message:
          'expected structured_edit_provider_execution_receipt_replay_workflow_apply_decision envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    receiptReplayWorkflowApplyDecision?: StructuredEditProviderExecutionReceiptReplayWorkflowApplyDecision;
    receipt_replay_workflow_apply_decision?: StructuredEditProviderExecutionReceiptReplayWorkflowApplyDecision;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_execution_receipt_replay_workflow_apply_decision envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    receiptReplayWorkflowApplyDecision:
      envelope.receiptReplayWorkflowApplyDecision ?? envelope.receipt_replay_workflow_apply_decision
  };
}

export function structuredEditProviderExecutionReceiptReplayWorkflowApplyDecisionOutcomeEnvelope(
  receiptReplayWorkflowApplyDecisionOutcome: StructuredEditProviderExecutionReceiptReplayWorkflowApplyDecisionOutcome
): StructuredEditProviderExecutionReceiptReplayWorkflowApplyDecisionOutcomeEnvelope {
  return {
    kind: 'structured_edit_provider_execution_receipt_replay_workflow_apply_decision_outcome',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    receiptReplayWorkflowApplyDecisionOutcome
  };
}

export function importStructuredEditProviderExecutionReceiptReplayWorkflowApplyDecisionOutcomeEnvelope(
  value: unknown
): {
  receiptReplayWorkflowApplyDecisionOutcome?: StructuredEditProviderExecutionReceiptReplayWorkflowApplyDecisionOutcome;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !==
      'structured_edit_provider_execution_receipt_replay_workflow_apply_decision_outcome'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message:
          'expected structured_edit_provider_execution_receipt_replay_workflow_apply_decision_outcome envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    receiptReplayWorkflowApplyDecisionOutcome?: StructuredEditProviderExecutionReceiptReplayWorkflowApplyDecisionOutcome;
    receipt_replay_workflow_apply_decision_outcome?: StructuredEditProviderExecutionReceiptReplayWorkflowApplyDecisionOutcome;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_execution_receipt_replay_workflow_apply_decision_outcome envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    receiptReplayWorkflowApplyDecisionOutcome:
      envelope.receiptReplayWorkflowApplyDecisionOutcome ??
      envelope.receipt_replay_workflow_apply_decision_outcome
  };
}

export function structuredEditProviderBatchExecutionReceiptReplayWorkflowApplyRequestEnvelope(
  batchReceiptReplayWorkflowApplyRequest: StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyRequest
): StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyRequestEnvelope {
  return {
    kind: 'structured_edit_provider_batch_execution_receipt_replay_workflow_apply_request',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchReceiptReplayWorkflowApplyRequest
  };
}

export function importStructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyRequestEnvelope(
  value: unknown
): {
  batchReceiptReplayWorkflowApplyRequest?: StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyRequest;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !==
      'structured_edit_provider_batch_execution_receipt_replay_workflow_apply_request'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message:
          'expected structured_edit_provider_batch_execution_receipt_replay_workflow_apply_request envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    batchReceiptReplayWorkflowApplyRequest?: StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyRequest;
    batch_receipt_replay_workflow_apply_request?: StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyRequest;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_batch_execution_receipt_replay_workflow_apply_request envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    batchReceiptReplayWorkflowApplyRequest:
      envelope.batchReceiptReplayWorkflowApplyRequest ??
      envelope.batch_receipt_replay_workflow_apply_request
  };
}

export function structuredEditProviderBatchExecutionReceiptReplayWorkflowApplySessionEnvelope(
  batchReceiptReplayWorkflowApplySession: StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplySession
): StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplySessionEnvelope {
  return {
    kind: 'structured_edit_provider_batch_execution_receipt_replay_workflow_apply_session',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchReceiptReplayWorkflowApplySession
  };
}

export function importStructuredEditProviderBatchExecutionReceiptReplayWorkflowApplySessionEnvelope(
  value: unknown
): {
  batchReceiptReplayWorkflowApplySession?: StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplySession;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !==
      'structured_edit_provider_batch_execution_receipt_replay_workflow_apply_session'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message:
          'expected structured_edit_provider_batch_execution_receipt_replay_workflow_apply_session envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    batchReceiptReplayWorkflowApplySession?: StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplySession;
    batch_receipt_replay_workflow_apply_session?: StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplySession;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_batch_execution_receipt_replay_workflow_apply_session envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    batchReceiptReplayWorkflowApplySession:
      envelope.batchReceiptReplayWorkflowApplySession ??
      envelope.batch_receipt_replay_workflow_apply_session
  };
}

export function structuredEditProviderBatchExecutionReceiptReplayWorkflowApplyResultEnvelope(
  batchReceiptReplayWorkflowApplyResult: StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyResult
): StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyResultEnvelope {
  return {
    kind: 'structured_edit_provider_batch_execution_receipt_replay_workflow_apply_result',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchReceiptReplayWorkflowApplyResult
  };
}

export function importStructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyResultEnvelope(
  value: unknown
): {
  batchReceiptReplayWorkflowApplyResult?: StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyResult;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !==
      'structured_edit_provider_batch_execution_receipt_replay_workflow_apply_result'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message:
          'expected structured_edit_provider_batch_execution_receipt_replay_workflow_apply_result envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    batchReceiptReplayWorkflowApplyResult?: StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyResult;
    batch_receipt_replay_workflow_apply_result?: StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyResult;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_batch_execution_receipt_replay_workflow_apply_result envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    batchReceiptReplayWorkflowApplyResult:
      envelope.batchReceiptReplayWorkflowApplyResult ??
      envelope.batch_receipt_replay_workflow_apply_result
  };
}

export function structuredEditProviderBatchExecutionReceiptReplayWorkflowApplyDecisionEnvelope(
  batchReceiptReplayWorkflowApplyDecision: StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyDecision
): StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyDecisionEnvelope {
  return {
    kind: 'structured_edit_provider_batch_execution_receipt_replay_workflow_apply_decision',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchReceiptReplayWorkflowApplyDecision
  };
}

export function importStructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyDecisionEnvelope(
  value: unknown
): {
  batchReceiptReplayWorkflowApplyDecision?: StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyDecision;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !==
      'structured_edit_provider_batch_execution_receipt_replay_workflow_apply_decision'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message:
          'expected structured_edit_provider_batch_execution_receipt_replay_workflow_apply_decision envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    batchReceiptReplayWorkflowApplyDecision?: StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyDecision;
    batch_receipt_replay_workflow_apply_decision?: StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyDecision;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_batch_execution_receipt_replay_workflow_apply_decision envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    batchReceiptReplayWorkflowApplyDecision:
      envelope.batchReceiptReplayWorkflowApplyDecision ??
      envelope.batch_receipt_replay_workflow_apply_decision
  };
}

export function structuredEditProviderBatchExecutionReceiptReplayWorkflowApplyDecisionOutcomeEnvelope(
  batchReceiptReplayWorkflowApplyDecisionOutcome: StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyDecisionOutcome
): StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyDecisionOutcomeEnvelope {
  return {
    kind: 'structured_edit_provider_batch_execution_receipt_replay_workflow_apply_decision_outcome',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchReceiptReplayWorkflowApplyDecisionOutcome
  };
}

export function importStructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyDecisionOutcomeEnvelope(
  value: unknown
): {
  batchReceiptReplayWorkflowApplyDecisionOutcome?: StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyDecisionOutcome;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !==
      'structured_edit_provider_batch_execution_receipt_replay_workflow_apply_decision_outcome'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message:
          'expected structured_edit_provider_batch_execution_receipt_replay_workflow_apply_decision_outcome envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    batchReceiptReplayWorkflowApplyDecisionOutcome?: StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyDecisionOutcome;
    batch_receipt_replay_workflow_apply_decision_outcome?: StructuredEditProviderBatchExecutionReceiptReplayWorkflowApplyDecisionOutcome;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_batch_execution_receipt_replay_workflow_apply_decision_outcome envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    batchReceiptReplayWorkflowApplyDecisionOutcome:
      envelope.batchReceiptReplayWorkflowApplyDecisionOutcome ??
      envelope.batch_receipt_replay_workflow_apply_decision_outcome
  };
}

export function structuredEditProviderBatchExecutionReceiptReplayWorkflowReviewRequestEnvelope(
  batchReceiptReplayWorkflowReviewRequest: StructuredEditProviderBatchExecutionReceiptReplayWorkflowReviewRequest
): StructuredEditProviderBatchExecutionReceiptReplayWorkflowReviewRequestEnvelope {
  return {
    kind: 'structured_edit_provider_batch_execution_receipt_replay_workflow_review_request',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchReceiptReplayWorkflowReviewRequest
  };
}

export function importStructuredEditProviderBatchExecutionReceiptReplayWorkflowReviewRequestEnvelope(
  value: unknown
): {
  batchReceiptReplayWorkflowReviewRequest?: StructuredEditProviderBatchExecutionReceiptReplayWorkflowReviewRequest;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !==
      'structured_edit_provider_batch_execution_receipt_replay_workflow_review_request'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message:
          'expected structured_edit_provider_batch_execution_receipt_replay_workflow_review_request envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    batchReceiptReplayWorkflowReviewRequest?: StructuredEditProviderBatchExecutionReceiptReplayWorkflowReviewRequest;
    batch_receipt_replay_workflow_review_request?: StructuredEditProviderBatchExecutionReceiptReplayWorkflowReviewRequest;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_batch_execution_receipt_replay_workflow_review_request envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    batchReceiptReplayWorkflowReviewRequest:
      envelope.batchReceiptReplayWorkflowReviewRequest ??
      envelope.batch_receipt_replay_workflow_review_request
  };
}

export function structuredEditProviderBatchExecutionHandoffEnvelope(
  batchExecutionHandoff: StructuredEditProviderBatchExecutionHandoff
): StructuredEditProviderBatchExecutionHandoffEnvelope {
  return {
    kind: 'structured_edit_provider_batch_execution_handoff',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchExecutionHandoff
  };
}

export function importStructuredEditProviderBatchExecutionHandoffEnvelope(value: unknown): {
  batchExecutionHandoff?: StructuredEditProviderBatchExecutionHandoff;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'structured_edit_provider_batch_execution_handoff'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_provider_batch_execution_handoff envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    batchExecutionHandoff?: StructuredEditProviderBatchExecutionHandoff;
    batch_execution_handoff?: StructuredEditProviderBatchExecutionHandoff;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_batch_execution_handoff envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    batchExecutionHandoff: envelope.batchExecutionHandoff ?? envelope.batch_execution_handoff
  };
}

export function structuredEditProviderBatchExecutionPlanEnvelope(
  batchExecutionPlan: StructuredEditProviderBatchExecutionPlan
): StructuredEditProviderBatchExecutionPlanEnvelope {
  return {
    kind: 'structured_edit_provider_batch_execution_plan',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchExecutionPlan
  };
}

export function importStructuredEditProviderBatchExecutionPlanEnvelope(value: unknown): {
  batchExecutionPlan?: StructuredEditProviderBatchExecutionPlan;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'structured_edit_provider_batch_execution_plan'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_provider_batch_execution_plan envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    batchExecutionPlan?: StructuredEditProviderBatchExecutionPlan;
    batch_execution_plan?: StructuredEditProviderBatchExecutionPlan;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_batch_execution_plan envelope version ${String(envelope.version)}.`
      }
    };
  }

  return { batchExecutionPlan: envelope.batchExecutionPlan ?? envelope.batch_execution_plan };
}

export function structuredEditProviderExecutionApplicationEnvelope(
  providerExecutionApplication: StructuredEditProviderExecutionApplication
): StructuredEditProviderExecutionApplicationEnvelope {
  return {
    kind: 'structured_edit_provider_execution_application',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    providerExecutionApplication
  };
}

export function importStructuredEditProviderExecutionApplicationEnvelope(value: unknown): {
  providerExecutionApplication?: StructuredEditProviderExecutionApplication;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'structured_edit_provider_execution_application'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_provider_execution_application envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    providerExecutionApplication?: StructuredEditProviderExecutionApplication;
    provider_execution_application?: StructuredEditProviderExecutionApplication;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_execution_application envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    providerExecutionApplication:
      envelope.providerExecutionApplication ?? envelope.provider_execution_application
  };
}

export function structuredEditProviderExecutionDispatchEnvelope(
  providerExecutionDispatch: StructuredEditProviderExecutionDispatch
): StructuredEditProviderExecutionDispatchEnvelope {
  return {
    kind: 'structured_edit_provider_execution_dispatch',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    providerExecutionDispatch
  };
}

export function importStructuredEditProviderExecutionDispatchEnvelope(value: unknown): {
  providerExecutionDispatch?: StructuredEditProviderExecutionDispatch;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'structured_edit_provider_execution_dispatch'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_provider_execution_dispatch envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    providerExecutionDispatch?: StructuredEditProviderExecutionDispatch;
    provider_execution_dispatch?: StructuredEditProviderExecutionDispatch;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_execution_dispatch envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    providerExecutionDispatch:
      envelope.providerExecutionDispatch ?? envelope.provider_execution_dispatch
  };
}

export function structuredEditProviderExecutionOutcomeEnvelope(
  providerExecutionOutcome: StructuredEditProviderExecutionOutcome
): StructuredEditProviderExecutionOutcomeEnvelope {
  return {
    kind: 'structured_edit_provider_execution_outcome',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    providerExecutionOutcome
  };
}

export function importStructuredEditProviderExecutionOutcomeEnvelope(value: unknown): {
  providerExecutionOutcome?: StructuredEditProviderExecutionOutcome;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'structured_edit_provider_execution_outcome'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_provider_execution_outcome envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    providerExecutionOutcome?: StructuredEditProviderExecutionOutcome;
    provider_execution_outcome?: StructuredEditProviderExecutionOutcome;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_execution_outcome envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    providerExecutionOutcome:
      envelope.providerExecutionOutcome ?? envelope.provider_execution_outcome
  };
}

export function structuredEditProviderBatchExecutionOutcomeEnvelope(
  batchOutcome: StructuredEditProviderBatchExecutionOutcome
): StructuredEditProviderBatchExecutionOutcomeEnvelope {
  return {
    kind: 'structured_edit_provider_batch_execution_outcome',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchOutcome
  };
}

export function importStructuredEditProviderBatchExecutionOutcomeEnvelope(value: unknown): {
  batchOutcome?: StructuredEditProviderBatchExecutionOutcome;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'structured_edit_provider_batch_execution_outcome'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_provider_batch_execution_outcome envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    batchOutcome?: StructuredEditProviderBatchExecutionOutcome;
    batch_outcome?: StructuredEditProviderBatchExecutionOutcome;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_batch_execution_outcome envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    batchOutcome: envelope.batchOutcome ?? envelope.batch_outcome
  };
}

export function structuredEditProviderExecutionProvenanceEnvelope(
  provenance: StructuredEditProviderExecutionProvenance
): StructuredEditProviderExecutionProvenanceEnvelope {
  return {
    kind: 'structured_edit_provider_execution_provenance',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    provenance
  };
}

export function importStructuredEditProviderExecutionProvenanceEnvelope(value: unknown): {
  provenance?: StructuredEditProviderExecutionProvenance;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'structured_edit_provider_execution_provenance'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_provider_execution_provenance envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    provenance?: StructuredEditProviderExecutionProvenance;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_execution_provenance envelope version ${String(envelope.version)}.`
      }
    };
  }

  return { provenance: envelope.provenance };
}

export function structuredEditProviderBatchExecutionProvenanceEnvelope(
  batchProvenance: StructuredEditProviderBatchExecutionProvenance
): StructuredEditProviderBatchExecutionProvenanceEnvelope {
  return {
    kind: 'structured_edit_provider_batch_execution_provenance',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchProvenance
  };
}

export function importStructuredEditProviderBatchExecutionProvenanceEnvelope(value: unknown): {
  batchProvenance?: StructuredEditProviderBatchExecutionProvenance;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'structured_edit_provider_batch_execution_provenance'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_provider_batch_execution_provenance envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    batchProvenance?: StructuredEditProviderBatchExecutionProvenance;
    batch_provenance?: StructuredEditProviderBatchExecutionProvenance;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_batch_execution_provenance envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    batchProvenance: envelope.batchProvenance ?? envelope.batch_provenance
  };
}

export function structuredEditProviderExecutionReplayBundleEnvelope(
  replayBundle: StructuredEditProviderExecutionReplayBundle
): StructuredEditProviderExecutionReplayBundleEnvelope {
  return {
    kind: 'structured_edit_provider_execution_replay_bundle',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    replayBundle
  };
}

export function importStructuredEditProviderExecutionReplayBundleEnvelope(value: unknown): {
  replayBundle?: StructuredEditProviderExecutionReplayBundle;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'structured_edit_provider_execution_replay_bundle'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_provider_execution_replay_bundle envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    replayBundle?: StructuredEditProviderExecutionReplayBundle;
    replay_bundle?: StructuredEditProviderExecutionReplayBundle;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_execution_replay_bundle envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    replayBundle: envelope.replayBundle ?? envelope.replay_bundle
  };
}

export function structuredEditProviderBatchExecutionReplayBundleEnvelope(
  batchReplayBundle: StructuredEditProviderBatchExecutionReplayBundle
): StructuredEditProviderBatchExecutionReplayBundleEnvelope {
  return {
    kind: 'structured_edit_provider_batch_execution_replay_bundle',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchReplayBundle
  };
}

export function importStructuredEditProviderBatchExecutionReplayBundleEnvelope(value: unknown): {
  batchReplayBundle?: StructuredEditProviderBatchExecutionReplayBundle;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'structured_edit_provider_batch_execution_replay_bundle'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_provider_batch_execution_replay_bundle envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    batchReplayBundle?: StructuredEditProviderBatchExecutionReplayBundle;
    batch_replay_bundle?: StructuredEditProviderBatchExecutionReplayBundle;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_batch_execution_replay_bundle envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    batchReplayBundle: envelope.batchReplayBundle ?? envelope.batch_replay_bundle
  };
}

export function structuredEditProviderExecutorProfileEnvelope(
  executorProfile: StructuredEditProviderExecutorProfile
): StructuredEditProviderExecutorProfileEnvelope {
  return {
    kind: 'structured_edit_provider_executor_profile',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    executorProfile
  };
}

export function importStructuredEditProviderExecutorProfileEnvelope(value: unknown): {
  executorProfile?: StructuredEditProviderExecutorProfile;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'structured_edit_provider_executor_profile'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_provider_executor_profile envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    executorProfile?: StructuredEditProviderExecutorProfile;
    executor_profile?: StructuredEditProviderExecutorProfile;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_executor_profile envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    executorProfile: envelope.executorProfile ?? envelope.executor_profile
  };
}

export function structuredEditProviderExecutorRegistryEnvelope(
  executorRegistry: StructuredEditProviderExecutorRegistry
): StructuredEditProviderExecutorRegistryEnvelope {
  return {
    kind: 'structured_edit_provider_executor_registry',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    executorRegistry
  };
}

export function importStructuredEditProviderExecutorRegistryEnvelope(value: unknown): {
  executorRegistry?: StructuredEditProviderExecutorRegistry;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'structured_edit_provider_executor_registry'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_provider_executor_registry envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    executorRegistry?: StructuredEditProviderExecutorRegistry;
    executor_registry?: StructuredEditProviderExecutorRegistry;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_executor_registry envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    executorRegistry: envelope.executorRegistry ?? envelope.executor_registry
  };
}

export function structuredEditProviderExecutorSelectionPolicyEnvelope(
  selectionPolicy: StructuredEditProviderExecutorSelectionPolicy
): StructuredEditProviderExecutorSelectionPolicyEnvelope {
  return {
    kind: 'structured_edit_provider_executor_selection_policy',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    selectionPolicy
  };
}

export function importStructuredEditProviderExecutorSelectionPolicyEnvelope(value: unknown): {
  selectionPolicy?: StructuredEditProviderExecutorSelectionPolicy;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'structured_edit_provider_executor_selection_policy'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_provider_executor_selection_policy envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    selectionPolicy?: StructuredEditProviderExecutorSelectionPolicy;
    selection_policy?: StructuredEditProviderExecutorSelectionPolicy;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_executor_selection_policy envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    selectionPolicy: envelope.selectionPolicy ?? envelope.selection_policy
  };
}

export function structuredEditProviderExecutorResolutionEnvelope(
  executorResolution: StructuredEditProviderExecutorResolution
): StructuredEditProviderExecutorResolutionEnvelope {
  return {
    kind: 'structured_edit_provider_executor_resolution',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    executorResolution
  };
}

export function importStructuredEditProviderExecutorResolutionEnvelope(value: unknown): {
  executorResolution?: StructuredEditProviderExecutorResolution;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'structured_edit_provider_executor_resolution'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_provider_executor_resolution envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    executorResolution?: StructuredEditProviderExecutorResolution;
    executor_resolution?: StructuredEditProviderExecutorResolution;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_executor_resolution envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    executorResolution: envelope.executorResolution ?? envelope.executor_resolution
  };
}

export function structuredEditExecutionReportEnvelope(
  report: StructuredEditExecutionReport
): StructuredEditExecutionReportEnvelope {
  return {
    kind: 'structured_edit_execution_report',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    report
  };
}

export function importStructuredEditExecutionReportEnvelope(value: unknown): {
  report?: StructuredEditExecutionReport;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'structured_edit_execution_report'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_execution_report envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    report: StructuredEditExecutionReport;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_execution_report envelope version ${String(envelope.version)}.`
      }
    };
  }

  return { report: envelope.report };
}

export function structuredEditProviderBatchExecutionRequestEnvelope(
  batchExecutionRequest: StructuredEditProviderBatchExecutionRequest
): StructuredEditProviderBatchExecutionRequestEnvelope {
  return {
    kind: 'structured_edit_provider_batch_execution_request',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchExecutionRequest
  };
}

export function importStructuredEditProviderBatchExecutionRequestEnvelope(value: unknown): {
  batchExecutionRequest?: StructuredEditProviderBatchExecutionRequest;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'structured_edit_provider_batch_execution_request'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_provider_batch_execution_request envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    batchExecutionRequest?: StructuredEditProviderBatchExecutionRequest;
    batch_execution_request?: StructuredEditProviderBatchExecutionRequest;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_batch_execution_request envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    batchExecutionRequest: envelope.batchExecutionRequest ?? envelope.batch_execution_request
  };
}

export function structuredEditProviderBatchExecutionDispatchEnvelope(
  batchDispatch: StructuredEditProviderBatchExecutionDispatch
): StructuredEditProviderBatchExecutionDispatchEnvelope {
  return {
    kind: 'structured_edit_provider_batch_execution_dispatch',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchDispatch
  };
}

export function importStructuredEditProviderBatchExecutionDispatchEnvelope(value: unknown): {
  batchDispatch?: StructuredEditProviderBatchExecutionDispatch;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'structured_edit_provider_batch_execution_dispatch'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_provider_batch_execution_dispatch envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    batchDispatch?: StructuredEditProviderBatchExecutionDispatch;
    batch_dispatch?: StructuredEditProviderBatchExecutionDispatch;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_batch_execution_dispatch envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    batchDispatch: envelope.batchDispatch ?? envelope.batch_dispatch
  };
}

export function structuredEditProviderBatchExecutionReportEnvelope(
  batchReport: StructuredEditProviderBatchExecutionReport
): StructuredEditProviderBatchExecutionReportEnvelope {
  return {
    kind: 'structured_edit_provider_batch_execution_report',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchReport
  };
}

export function importStructuredEditProviderBatchExecutionReportEnvelope(value: unknown): {
  batchReport?: StructuredEditProviderBatchExecutionReport;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'structured_edit_provider_batch_execution_report'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_provider_batch_execution_report envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    batchReport?: StructuredEditProviderBatchExecutionReport;
    batch_report?: StructuredEditProviderBatchExecutionReport;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_provider_batch_execution_report envelope version ${String(envelope.version)}.`
      }
    };
  }

  return {
    batchReport: envelope.batchReport ?? envelope.batch_report
  };
}

export function structuredEditBatchReportEnvelope(
  batchReport: StructuredEditBatchReport
): StructuredEditBatchReportEnvelope {
  return {
    kind: 'structured_edit_batch_report',
    version: STRUCTURED_EDIT_TRANSPORT_VERSION,
    batchReport
  };
}

export function importStructuredEditBatchReportEnvelope(value: unknown): {
  batchReport?: StructuredEditBatchReport;
  error?: StructuredEditTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'structured_edit_batch_report'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected structured_edit_batch_report envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    batchReport?: StructuredEditBatchReport;
    batch_report?: StructuredEditBatchReport;
  };

  if (envelope.version !== STRUCTURED_EDIT_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported structured_edit_batch_report envelope version ${String(envelope.version)}.`
      }
    };
  }

  return { batchReport: envelope.batchReport ?? envelope.batch_report };
}

export function classifyTemplateTargetPath(path: string): TemplateTargetClassification {
  const normalizedPath = path.replace(/^\.\//, '');
  const lowerPath = normalizedPath.toLowerCase();
  const base = normalizedPath.split('/').at(-1) ?? normalizedPath;
  const lowerBase = base.toLowerCase();
  const classify = (
    fileType: string,
    family: string,
    dialect: string
  ): TemplateTargetClassification => ({
    destinationPath: path,
    fileType,
    family,
    dialect
  });

  if (normalizedPath === '.git-hooks/commit-msg') {
    return classify('ruby', 'ruby', 'ruby');
  }
  if (normalizedPath === '.git-hooks/prepare-commit-msg') {
    return classify('bash', 'bash', 'bash');
  }

  if (base === 'Gemfile' || base === 'Appraisal.root.gemfile') {
    return classify('gemfile', 'ruby', 'ruby');
  }
  if (base === 'Appraisals') {
    return classify('appraisals', 'ruby', 'ruby');
  }
  if (base === 'Rakefile' || base === '.simplecov') {
    return classify('ruby', 'ruby', 'ruby');
  }
  if (base === '.envrc') {
    return classify('bash', 'bash', 'bash');
  }
  if (base === '.tool-versions') {
    return classify('tool_versions', 'text', 'tool_versions');
  }
  if (base === 'CITATION.cff') {
    return classify('yaml', 'yaml', 'yaml');
  }

  if (lowerBase.endsWith('.gemspec')) {
    return classify('gemspec', 'ruby', 'ruby');
  }
  if (lowerBase.endsWith('.gemfile')) {
    return classify('gemfile', 'ruby', 'ruby');
  }
  if (lowerBase.endsWith('.rb') || lowerBase.endsWith('.rake')) {
    return classify('ruby', 'ruby', 'ruby');
  }
  if (lowerPath.endsWith('.yml') || lowerPath.endsWith('.yaml')) {
    return classify('yaml', 'yaml', 'yaml');
  }
  if (lowerPath.endsWith('.md') || lowerPath.endsWith('.markdown')) {
    return classify('markdown', 'markdown', 'markdown');
  }
  if (lowerPath.endsWith('.sh') || lowerPath.endsWith('.bash')) {
    return classify('bash', 'bash', 'bash');
  }
  if (lowerBase === '.env' || lowerBase.startsWith('.env.')) {
    return classify('dotenv', 'dotenv', 'dotenv');
  }
  if (lowerPath.endsWith('.jsonc')) {
    return classify('json', 'json', 'jsonc');
  }
  if (lowerPath.endsWith('.json')) {
    return classify('json', 'json', 'json');
  }
  if (lowerPath.endsWith('.toml')) {
    return classify('toml', 'toml', 'toml');
  }
  if (lowerPath.endsWith('.rbs')) {
    return classify('rbs', 'rbs', 'rbs');
  }

  return classify('text', 'text', 'text');
}

export function resolveTemplateDestinationPath(
  path: string,
  context: TemplateDestinationContext = {}
): string | undefined {
  if (path === '.kettle-jem.yml') {
    return undefined;
  }
  if (path === '.env.local') {
    return '.env.local.example';
  }
  if (path === 'gem.gemspec' && context.projectName?.trim()) {
    return `${context.projectName.trim()}.gemspec`;
  }

  return path;
}

export const DEFAULT_TEMPLATE_TOKEN_CONFIG: TemplateTokenConfig = {
  pre: '{',
  post: '}',
  separators: ['|', ':'],
  minSegments: 2,
  segmentPattern: '[A-Za-z0-9_]'
};

function separatorAt(config: TemplateTokenConfig, boundaryIndex: number): string {
  return config.separators[Math.min(boundaryIndex, config.separators.length - 1)] ?? '';
}

function segmentPatternRegExp(pattern: string): RegExp {
  return new RegExp(`^${pattern}$`);
}

function isValidTemplateTokenKey(key: string, config: TemplateTokenConfig): boolean {
  if (!key.length) {
    return false;
  }

  const segmentCharacter = segmentPatternRegExp(config.segmentPattern);
  let index = 0;
  let segments = 0;
  let boundaryIndex = 0;

  while (index < key.length) {
    const segmentStart = index;
    while (index < key.length && segmentCharacter.test(key[index] ?? '')) {
      index += 1;
    }

    if (index === segmentStart) {
      return false;
    }

    segments += 1;
    if (index === key.length) {
      break;
    }

    const separator = separatorAt(config, boundaryIndex);
    if (!separator || !key.startsWith(separator, index)) {
      return false;
    }

    index += separator.length;
    boundaryIndex += 1;
  }

  if (segments < config.minSegments) {
    return false;
  }

  return config.maxSegments === undefined || segments <= config.maxSegments;
}

export function templateTokenKeys(
  content: string,
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): readonly string[] {
  if (!content || !content.includes(config.pre)) {
    return [];
  }

  const keys: string[] = [];
  const seen = new Set<string>();
  let offset = 0;

  while (offset < content.length) {
    const tokenStart = content.indexOf(config.pre, offset);
    if (tokenStart === -1) {
      break;
    }

    const contentStart = tokenStart + config.pre.length;
    const tokenEnd = content.indexOf(config.post, contentStart);
    if (tokenEnd === -1) {
      break;
    }

    const key = content.slice(contentStart, tokenEnd);
    if (isValidTemplateTokenKey(key, config) && !seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }

    offset = tokenEnd + config.post.length;
  }

  return keys;
}

export function unresolvedTemplateTokenKeys(
  content: string,
  replacements: Readonly<Record<string, string>>,
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): readonly string[] {
  return templateTokenKeys(content, config).filter((key) => !(key in replacements));
}

export function resolveTemplateTokens(
  content: string,
  replacements: Readonly<Record<string, string>>,
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): string {
  let resolved = content;
  for (const key of templateTokenKeys(content, config)) {
    const replacement = replacements[key];
    if (replacement === undefined) {
      continue;
    }

    resolved = resolved.split(`${config.pre}${key}${config.post}`).join(replacement);
  }

  return resolved;
}

export function selectTemplateStrategy(
  path: string,
  defaultStrategy: TemplateStrategy = 'merge',
  overrides: readonly TemplateStrategyOverride[] = []
): TemplateStrategy {
  const normalizedPath = path.replace(/^\.\//, '');
  const override = overrides.find((entry) => entry.path.replace(/^\.\//, '') === normalizedPath);
  return override?.strategy ?? defaultStrategy;
}

export function planTemplateEntries(
  templateSourcePaths: readonly string[],
  context: TemplateDestinationContext = {},
  defaultStrategy: TemplateStrategy = 'merge',
  overrides: readonly TemplateStrategyOverride[] = []
): readonly TemplatePlanEntry[] {
  return templateSourcePaths.map((templateSourcePath) => {
    const logicalDestinationPath = normalizeTemplateSourcePath(templateSourcePath);
    const destinationPath = resolveTemplateDestinationPath(logicalDestinationPath, context);
    const classification = classifyTemplateTargetPath(logicalDestinationPath);
    const strategy = selectTemplateStrategy(logicalDestinationPath, defaultStrategy, overrides);

    return {
      templateSourcePath,
      logicalDestinationPath,
      destinationPath,
      classification,
      strategy,
      action: destinationPath === undefined ? 'omit' : strategy
    };
  });
}

export function enrichTemplatePlanEntries(
  entries: readonly TemplatePlanEntry[],
  existingDestinationPaths: readonly string[]
): readonly TemplatePlanStateEntry[] {
  const existing = new Set(existingDestinationPaths);
  return entries.map((entry) => {
    const destinationExists = entry.destinationPath ? existing.has(entry.destinationPath) : false;
    const writeAction = !entry.destinationPath
      ? 'omit'
      : entry.strategy === 'keep_destination'
        ? 'keep'
        : destinationExists
          ? 'update'
          : 'create';

    return {
      ...entry,
      destinationExists,
      writeAction
    };
  });
}

export function enrichTemplatePlanEntriesWithTokenState(
  entries: readonly TemplatePlanStateEntry[],
  templateContents: Readonly<Record<string, string>>,
  replacements: Readonly<Record<string, string>>,
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): readonly TemplatePlanTokenStateEntry[] {
  return entries.map((entry) => {
    const content = templateContents[entry.templateSourcePath] ?? '';
    const tokenKeys = templateTokenKeys(content, config);
    const unresolvedTokenKeys = tokenKeys.filter((key) => !(key in replacements));
    const tokenResolutionRequired =
      entry.destinationPath !== undefined &&
      entry.strategy !== 'keep_destination' &&
      entry.strategy !== 'raw_copy';
    const blocked = tokenResolutionRequired && unresolvedTokenKeys.length > 0;

    return {
      ...entry,
      tokenKeys,
      unresolvedTokenKeys,
      tokenResolutionRequired,
      blocked,
      blockReason: blocked ? 'unresolved_tokens' : undefined
    };
  });
}

export function prepareTemplateEntries(
  entries: readonly TemplatePlanTokenStateEntry[],
  templateContents: Readonly<Record<string, string>>,
  replacements: Readonly<Record<string, string>>,
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): readonly TemplatePreparedEntry[] {
  return entries.map((entry) => {
    const templateContent = templateContents[entry.templateSourcePath] ?? '';
    if (entry.blocked) {
      return {
        ...entry,
        templateContent,
        preparedTemplateContent: undefined,
        preparationAction: 'blocked'
      };
    }

    if (entry.tokenResolutionRequired) {
      return {
        ...entry,
        templateContent,
        preparedTemplateContent: resolveTemplateTokens(templateContent, replacements, config),
        preparationAction: 'resolve_tokens'
      };
    }

    return {
      ...entry,
      templateContent,
      preparedTemplateContent: templateContent,
      preparationAction: 'pass_through'
    };
  });
}

export function planTemplateExecution(
  entries: readonly TemplatePreparedEntry[],
  destinationContents: Readonly<Record<string, string>>
): readonly TemplateExecutionPlanEntry[] {
  return entries.map((entry) => {
    const destinationContent =
      entry.destinationPath === undefined ? undefined : destinationContents[entry.destinationPath];
    const executionAction: TemplateExecutionAction = entry.blocked
      ? 'blocked'
      : entry.destinationPath === undefined
        ? 'omit'
        : entry.writeAction === 'keep'
          ? 'keep'
          : entry.strategy === 'raw_copy'
            ? 'raw_copy'
            : entry.strategy === 'accept_template'
              ? 'write_prepared_content'
              : 'merge_prepared_content';
    const ready =
      executionAction !== 'blocked' && executionAction !== 'omit' && executionAction !== 'keep';

    return {
      ...entry,
      executionAction,
      ready,
      destinationContent
    };
  });
}

export function planTemplateTreeExecution(
  templateSourcePaths: readonly string[],
  templateContents: Readonly<Record<string, string>>,
  existingDestinationPaths: readonly string[],
  destinationContents: Readonly<Record<string, string>>,
  context: TemplateDestinationContext = {},
  defaultStrategy: TemplateStrategy = 'merge',
  overrides: readonly TemplateStrategyOverride[] = [],
  replacements: Readonly<Record<string, string>> = {},
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): readonly TemplateExecutionPlanEntry[] {
  const plannedEntries = planTemplateEntries(
    templateSourcePaths,
    context,
    defaultStrategy,
    overrides
  );
  const statefulEntries = enrichTemplatePlanEntries(plannedEntries, existingDestinationPaths);
  const tokenStateEntries = enrichTemplatePlanEntriesWithTokenState(
    statefulEntries,
    templateContents,
    replacements,
    config
  );
  const preparedEntries = prepareTemplateEntries(
    tokenStateEntries,
    templateContents,
    replacements,
    config
  );

  return planTemplateExecution(preparedEntries, destinationContents);
}

export function previewTemplateExecution(
  entries: readonly TemplateExecutionPlanEntry[]
): TemplatePreviewResult {
  const resultFiles: Record<string, string> = {};
  const createdPaths: string[] = [];
  const updatedPaths: string[] = [];
  const keptPaths: string[] = [];
  const blockedPaths: string[] = [];
  const omittedPaths: string[] = [];

  for (const entry of entries) {
    const destinationPath = entry.destinationPath;
    switch (entry.executionAction) {
      case 'blocked':
        if (destinationPath !== undefined) {
          blockedPaths.push(destinationPath);
        }
        break;
      case 'omit':
        omittedPaths.push(entry.logicalDestinationPath);
        break;
      case 'keep':
        if (destinationPath !== undefined && entry.destinationContent !== undefined) {
          resultFiles[destinationPath] = entry.destinationContent;
          keptPaths.push(destinationPath);
        }
        break;
      case 'raw_copy':
      case 'write_prepared_content':
        if (destinationPath !== undefined && entry.preparedTemplateContent !== undefined) {
          resultFiles[destinationPath] = entry.preparedTemplateContent;
          if (
            entry.destinationExists &&
            entry.destinationContent !== undefined &&
            entry.destinationContent === entry.preparedTemplateContent
          ) {
            keptPaths.push(destinationPath);
          } else if (entry.destinationExists) {
            updatedPaths.push(destinationPath);
          } else {
            createdPaths.push(destinationPath);
          }
        }
        break;
      case 'merge_prepared_content':
        if (
          destinationPath !== undefined &&
          entry.preparedTemplateContent !== undefined &&
          entry.destinationContent === undefined
        ) {
          resultFiles[destinationPath] = entry.preparedTemplateContent;
          if (entry.destinationExists) {
            updatedPaths.push(destinationPath);
          } else {
            createdPaths.push(destinationPath);
          }
        }
        break;
    }
  }

  return {
    resultFiles,
    createdPaths,
    updatedPaths,
    keptPaths,
    blockedPaths,
    omittedPaths
  };
}

export function applyTemplateExecution(
  entries: readonly TemplateExecutionPlanEntry[],
  mergePreparedContent: (entry: TemplateExecutionPlanEntry) => MergeResult<string>
): TemplateApplyResult {
  const preview = previewTemplateExecution([]);
  const resultFiles: Record<string, string> = {};
  const createdPaths: string[] = [];
  const updatedPaths: string[] = [];
  const keptPaths: string[] = [];
  const blockedPaths: string[] = [];
  const omittedPaths: string[] = [];
  const diagnostics: Diagnostic[] = [];

  for (const entry of entries) {
    const destinationPath = entry.destinationPath;
    switch (entry.executionAction) {
      case 'blocked':
        if (destinationPath !== undefined) {
          blockedPaths.push(destinationPath);
        }
        break;
      case 'omit':
        omittedPaths.push(entry.logicalDestinationPath);
        break;
      case 'keep':
        if (destinationPath !== undefined && entry.destinationContent !== undefined) {
          resultFiles[destinationPath] = entry.destinationContent;
          keptPaths.push(destinationPath);
        }
        break;
      case 'raw_copy':
      case 'write_prepared_content':
        if (destinationPath !== undefined && entry.preparedTemplateContent !== undefined) {
          recordTemplateApplyOutput(
            resultFiles,
            createdPaths,
            updatedPaths,
            keptPaths,
            entry,
            entry.preparedTemplateContent
          );
        }
        break;
      case 'merge_prepared_content':
        if (destinationPath === undefined || entry.preparedTemplateContent === undefined) {
          break;
        }
        if (entry.destinationContent === undefined) {
          recordTemplateApplyOutput(
            resultFiles,
            createdPaths,
            updatedPaths,
            keptPaths,
            entry,
            entry.preparedTemplateContent
          );
          break;
        }
        {
          const mergeResult = mergePreparedContent(entry);
          diagnostics.push(...mergeResult.diagnostics);
          if (!mergeResult.ok || mergeResult.output === undefined) {
            blockedPaths.push(destinationPath);
            break;
          }
          recordTemplateApplyOutput(
            resultFiles,
            createdPaths,
            updatedPaths,
            keptPaths,
            entry,
            mergeResult.output
          );
        }
        break;
    }
  }

  void preview;
  return {
    resultFiles,
    createdPaths,
    updatedPaths,
    keptPaths,
    blockedPaths,
    omittedPaths,
    diagnostics
  };
}

export function evaluateTemplateTreeConvergence(
  templateSourcePaths: readonly string[],
  templateContents: Readonly<Record<string, string>>,
  destinationContents: Readonly<Record<string, string>>,
  context: TemplateDestinationContext = {},
  defaultStrategy: TemplateStrategy = 'merge',
  overrides: readonly TemplateStrategyOverride[] = [],
  replacements: Readonly<Record<string, string>> = {},
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): TemplateConvergenceResult {
  const executionPlan = planTemplateTreeExecution(
    templateSourcePaths,
    templateContents,
    Object.keys(destinationContents).sort(),
    destinationContents,
    context,
    defaultStrategy,
    overrides,
    replacements,
    config
  );
  const pendingPaths = executionPlan
    .filter((entry) => {
      if (entry.blocked) {
        return true;
      }
      if (!entry.ready) {
        return false;
      }

      return (
        entry.destinationContent === undefined ||
        entry.preparedTemplateContent === undefined ||
        entry.destinationContent !== entry.preparedTemplateContent
      );
    })
    .map((entry) => entry.destinationPath ?? entry.logicalDestinationPath);

  return {
    converged: pendingPaths.length === 0,
    pendingPaths
  };
}

export function runTemplateTreeExecution(
  templateSourcePaths: readonly string[],
  templateContents: Readonly<Record<string, string>>,
  destinationContents: Readonly<Record<string, string>>,
  context: TemplateDestinationContext = {},
  defaultStrategy: TemplateStrategy = 'merge',
  overrides: readonly TemplateStrategyOverride[] = [],
  replacements: Readonly<Record<string, string>> = {},
  mergePreparedContent: (entry: TemplateExecutionPlanEntry) => MergeResult<string>,
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): TemplateTreeRunResult {
  const executionPlan = planTemplateTreeExecution(
    templateSourcePaths,
    templateContents,
    Object.keys(destinationContents).sort(),
    destinationContents,
    context,
    defaultStrategy,
    overrides,
    replacements,
    config
  );

  return {
    executionPlan,
    applyResult: applyTemplateExecution(executionPlan, mergePreparedContent)
  };
}

export function readRelativeFileTree(root: string): Readonly<Record<string, string>> {
  const files: Record<string, string> = {};
  if (!existsSync(root)) {
    return files;
  }
  if (!statSync(root).isDirectory()) {
    throw new Error(`${root} is not a directory`);
  }

  const walk = (currentPath: string): void => {
    for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }

      const relativePath = path.relative(root, entryPath).split(path.sep).join('/');
      files[relativePath] = readFileSync(entryPath, 'utf8');
    }
  };

  walk(root);
  return files;
}

export function writeRelativeFileTree(root: string, files: Readonly<Record<string, string>>): void {
  mkdirSync(root, { recursive: true });

  for (const relativePath of Object.keys(files).sort()) {
    const fullPath = path.join(root, ...relativePath.split('/'));
    mkdirSync(path.dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, files[relativePath] ?? '', 'utf8');
  }
}

export function runTemplateTreeExecutionFromDirectories(
  templateRoot: string,
  destinationRoot: string,
  context: TemplateDestinationContext = {},
  defaultStrategy: TemplateStrategy = 'merge',
  overrides: readonly TemplateStrategyOverride[] = [],
  replacements: Readonly<Record<string, string>> = {},
  mergePreparedContent: (entry: TemplateExecutionPlanEntry) => MergeResult<string>,
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): TemplateTreeRunResult {
  const templateContents = readRelativeFileTree(templateRoot);
  const destinationContents = readRelativeFileTree(destinationRoot);
  const templateSourcePaths = Object.keys(templateContents).sort();

  return runTemplateTreeExecution(
    templateSourcePaths,
    templateContents,
    destinationContents,
    context,
    defaultStrategy,
    overrides,
    replacements,
    mergePreparedContent,
    config
  );
}

export function planTemplateTreeExecutionFromDirectories(
  templateRoot: string,
  destinationRoot: string,
  context: TemplateDestinationContext = {},
  defaultStrategy: TemplateStrategy = 'merge',
  overrides: readonly TemplateStrategyOverride[] = [],
  replacements: Readonly<Record<string, string>> = {},
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): readonly TemplateExecutionPlanEntry[] {
  const templateContents = readRelativeFileTree(templateRoot);
  const destinationContents = readRelativeFileTree(destinationRoot);
  const templateSourcePaths = Object.keys(templateContents).sort();

  return planTemplateTreeExecution(
    templateSourcePaths,
    templateContents,
    Object.keys(destinationContents).sort(),
    destinationContents,
    context,
    defaultStrategy,
    overrides,
    replacements,
    config
  );
}

export function applyTemplateTreeExecutionToDirectory(
  templateRoot: string,
  destinationRoot: string,
  context: TemplateDestinationContext = {},
  defaultStrategy: TemplateStrategy = 'merge',
  overrides: readonly TemplateStrategyOverride[] = [],
  replacements: Readonly<Record<string, string>> = {},
  mergePreparedContent: (entry: TemplateExecutionPlanEntry) => MergeResult<string>,
  config: TemplateTokenConfig = DEFAULT_TEMPLATE_TOKEN_CONFIG
): TemplateTreeRunResult {
  const runResult = runTemplateTreeExecutionFromDirectories(
    templateRoot,
    destinationRoot,
    context,
    defaultStrategy,
    overrides,
    replacements,
    mergePreparedContent,
    config
  );

  const filesToWrite: Record<string, string> = {};
  for (const filePath of [
    ...runResult.applyResult.createdPaths,
    ...runResult.applyResult.updatedPaths
  ]) {
    const content = runResult.applyResult.resultFiles[filePath];
    if (content !== undefined) {
      filesToWrite[filePath] = content;
    }
  }
  writeRelativeFileTree(destinationRoot, filesToWrite);

  return runResult;
}

export function reportTemplateTreeRun(result: TemplateTreeRunResult): TemplateTreeRunReport {
  const created = new Set(result.applyResult.createdPaths);
  const updated = new Set(result.applyResult.updatedPaths);
  const kept = new Set(result.applyResult.keptPaths);
  const blocked = new Set(result.applyResult.blockedPaths);
  const omitted = new Set(result.applyResult.omittedPaths);

  const entries = result.executionPlan.map((entry) => {
    const status: TemplateTreeRunStatus =
      entry.executionAction === 'omit' || omitted.has(entry.logicalDestinationPath)
        ? 'omitted'
        : entry.destinationPath && blocked.has(entry.destinationPath)
          ? 'blocked'
          : entry.destinationPath && kept.has(entry.destinationPath)
            ? 'kept'
            : entry.destinationPath && updated.has(entry.destinationPath)
              ? 'updated'
              : 'created';

    return {
      templateSourcePath: entry.templateSourcePath,
      logicalDestinationPath: entry.logicalDestinationPath,
      destinationPath: entry.destinationPath,
      executionAction: entry.executionAction,
      status
    };
  });

  return {
    entries,
    summary: {
      created: entries.filter((entry) => entry.status === 'created').length,
      updated: entries.filter((entry) => entry.status === 'updated').length,
      kept: entries.filter((entry) => entry.status === 'kept').length,
      blocked: entries.filter((entry) => entry.status === 'blocked').length,
      omitted: entries.filter((entry) => entry.status === 'omitted').length
    }
  };
}

export function reportTemplateDirectoryApply(
  result: TemplateTreeRunResult
): TemplateDirectoryApplyReport {
  const runReport = reportTemplateTreeRun(result);
  const created = new Set(result.applyResult.createdPaths);
  const updated = new Set(result.applyResult.updatedPaths);

  const entries = runReport.entries.map((entry) => ({
    templateSourcePath: entry.templateSourcePath,
    logicalDestinationPath: entry.logicalDestinationPath,
    destinationPath: entry.destinationPath,
    executionAction: entry.executionAction,
    status: entry.status,
    written:
      entry.destinationPath !== undefined &&
      (created.has(entry.destinationPath) || updated.has(entry.destinationPath))
  }));

  return {
    entries,
    summary: {
      created: entries.filter((entry) => entry.status === 'created').length,
      updated: entries.filter((entry) => entry.status === 'updated').length,
      kept: entries.filter((entry) => entry.status === 'kept').length,
      blocked: entries.filter((entry) => entry.status === 'blocked').length,
      omitted: entries.filter((entry) => entry.status === 'omitted').length,
      written: entries.filter((entry) => entry.written).length
    }
  };
}

export function reportTemplateDirectoryPlan(
  entries: readonly TemplateExecutionPlanEntry[]
): TemplateDirectoryPlanReport {
  const reportEntries = entries.map((entry) => {
    let status: TemplateDirectoryPlanStatus = 'update';
    let previewable = false;

    switch (entry.executionAction) {
      case 'blocked':
        status = 'blocked';
        break;
      case 'omit':
        status = 'omitted';
        previewable = true;
        break;
      case 'keep':
        status = 'keep';
        previewable = true;
        break;
      case 'raw_copy':
      case 'write_prepared_content':
        status = entry.writeAction === 'create' ? 'create' : 'update';
        previewable = true;
        break;
      case 'merge_prepared_content':
        status = entry.writeAction === 'create' ? 'create' : 'update';
        previewable = entry.writeAction === 'create';
        break;
    }

    return {
      templateSourcePath: entry.templateSourcePath,
      logicalDestinationPath: entry.logicalDestinationPath,
      destinationPath: entry.destinationPath,
      executionAction: entry.executionAction,
      writeAction: entry.writeAction,
      status,
      previewable
    };
  });

  return {
    entries: reportEntries,
    summary: {
      create: reportEntries.filter((entry) => entry.status === 'create').length,
      update: reportEntries.filter((entry) => entry.status === 'update').length,
      keep: reportEntries.filter((entry) => entry.status === 'keep').length,
      blocked: reportEntries.filter((entry) => entry.status === 'blocked').length,
      omitted: reportEntries.filter((entry) => entry.status === 'omitted').length
    }
  };
}

export function reportTemplateDirectoryRunner(
  entries: readonly TemplateExecutionPlanEntry[],
  result?: TemplateTreeRunResult
): TemplateDirectoryRunnerReport {
  return {
    planReport: reportTemplateDirectoryPlan(entries),
    preview: previewTemplateExecution(entries),
    runReport: result ? reportTemplateTreeRun(result) : undefined,
    applyReport: result ? reportTemplateDirectoryApply(result) : undefined
  };
}

function recordTemplateApplyOutput(
  resultFiles: Record<string, string>,
  createdPaths: string[],
  updatedPaths: string[],
  keptPaths: string[],
  entry: TemplateExecutionPlanEntry,
  output: string
): void {
  if (!entry.destinationPath) {
    return;
  }

  resultFiles[entry.destinationPath] = output;
  if (
    entry.destinationExists &&
    entry.destinationContent !== undefined &&
    entry.destinationContent === output
  ) {
    keptPaths.push(entry.destinationPath);
  } else if (entry.destinationExists) {
    updatedPaths.push(entry.destinationPath);
  } else {
    createdPaths.push(entry.destinationPath);
  }
}

export function conformanceSuiteDefinition(
  manifest: ConformanceManifest,
  suiteSelector: ConformanceSuiteSelector
): ConformanceSuiteDefinition | undefined {
  return manifest.suite_descriptors?.find(
    (candidate): candidate is ConformanceSuiteDefinition =>
      isSuiteDefinition(candidate) && suiteSelectorsEqual(candidate, suiteSelector)
  );
}

export function conformanceSuiteSelectors(
  manifest: ConformanceManifest
): readonly ConformanceSuiteSelector[] {
  return [...(manifest.suite_descriptors ?? [])]
    .filter(isSuiteDefinition)
    .map((definition) => ({ kind: definition.kind, subject: definition.subject }))
    .sort(compareSuiteSelectors);
}

export function defaultConformanceFamilyContext(
  familyProfile: FamilyFeatureProfile
): ConformanceFamilyPlanContext {
  return {
    familyProfile
  };
}

export function reviewRequestIdForFamilyContext(family: string): string {
  return `family_context:${family}`;
}

export function conformanceReviewHostHints(
  options: ConformanceManifestReviewOptions
): ReviewHostHints {
  return {
    interactive: options.interactive ?? false,
    requireExplicitContexts: options.requireExplicitContexts ?? false
  };
}

export function groupProjectedChildReviewCases(
  cases: readonly ProjectedChildReviewCase[]
): readonly ProjectedChildReviewGroup[] {
  const groups = new Map<string, ProjectedChildReviewGroup>();
  const order: string[] = [];

  for (const entry of cases) {
    const key = entry.delegatedApplyGroup;
    const existing = groups.get(key);

    if (existing) {
      groups.set(key, {
        ...existing,
        caseIds: [...existing.caseIds, entry.caseId],
        delegatedCaseIds: [...existing.delegatedCaseIds, entry.delegatedCaseId]
      });
      continue;
    }

    order.push(key);
    groups.set(key, {
      delegatedApplyGroup: entry.delegatedApplyGroup,
      parentOperationId: entry.parentOperationId,
      childOperationId: entry.childOperationId,
      delegatedRuntimeSurfacePath: entry.delegatedRuntimeSurfacePath,
      caseIds: [entry.caseId],
      delegatedCaseIds: [entry.delegatedCaseId]
    });
  }

  return order.map((key) => groups.get(key)!);
}

export function summarizeProjectedChildReviewGroupProgress(
  groups: readonly ProjectedChildReviewGroup[],
  resolvedCaseIds: readonly string[]
): readonly ProjectedChildReviewGroupProgress[] {
  const resolved = new Set(resolvedCaseIds);

  return groups.map((group) => {
    const resolvedGroupCaseIds = group.caseIds.filter((caseId) => resolved.has(caseId));
    const pendingCaseIds = group.caseIds.filter((caseId) => !resolved.has(caseId));

    return {
      delegatedApplyGroup: group.delegatedApplyGroup,
      parentOperationId: group.parentOperationId,
      childOperationId: group.childOperationId,
      delegatedRuntimeSurfacePath: group.delegatedRuntimeSurfacePath,
      resolvedCaseIds: resolvedGroupCaseIds,
      pendingCaseIds,
      complete: pendingCaseIds.length === 0
    };
  });
}

export function selectProjectedChildReviewGroupsReadyForApply(
  groups: readonly ProjectedChildReviewGroup[],
  resolvedCaseIds: readonly string[]
): readonly ProjectedChildReviewGroup[] {
  const resolved = new Set(resolvedCaseIds);

  return groups.filter((group) => group.caseIds.every((caseId) => resolved.has(caseId)));
}

export function reviewRequestIdForProjectedChildGroup(group: ProjectedChildReviewGroup): string {
  return `projected_child_group:${group.delegatedApplyGroup}`;
}

export function projectedChildGroupReviewRequest(
  group: ProjectedChildReviewGroup,
  family: string
): ReviewRequest {
  return {
    id: reviewRequestIdForProjectedChildGroup(group),
    kind: 'delegated_child_group',
    family,
    message: `delegated child group ${group.delegatedApplyGroup} is ready to apply for ${family}.`,
    blocking: true,
    delegatedGroup: group,
    actionOffers: [
      {
        action: 'apply_delegated_child_group',
        requiresContext: false
      }
    ],
    defaultAction: 'apply_delegated_child_group'
  };
}

export function selectProjectedChildReviewGroupsAcceptedForApply(
  groups: readonly ProjectedChildReviewGroup[],
  _family: string,
  decisions: readonly ReviewDecision[]
): readonly ProjectedChildReviewGroup[] {
  const acceptedRequestIds = new Set(
    decisions
      .filter((decision) => decision.action === 'apply_delegated_child_group')
      .map((decision) => decision.requestId)
  );

  return groups.filter((group) =>
    acceptedRequestIds.has(reviewRequestIdForProjectedChildGroup(group))
  );
}

export function reviewProjectedChildGroups(
  groups: readonly ProjectedChildReviewGroup[],
  family: string,
  decisions: readonly ReviewDecision[]
): DelegatedChildGroupReviewState {
  const requestIds = new Set(groups.map((group) => reviewRequestIdForProjectedChildGroup(group)));
  const appliedDecisions: ReviewDecision[] = [];
  const diagnostics: Diagnostic[] = [];

  for (const decision of decisions) {
    if (decision.action !== 'apply_delegated_child_group') {
      continue;
    }

    if (requestIds.has(decision.requestId)) {
      appliedDecisions.push(decision);
      continue;
    }

    diagnostics.push({
      severity: 'error',
      category: 'replay_rejected',
      message: `review decision ${decision.requestId} does not match any current delegated child review request.`,
      review: {
        requestId: decision.requestId,
        action: decision.action,
        reason: 'request_not_found'
      }
    });
  }

  const acceptedGroups = selectProjectedChildReviewGroupsAcceptedForApply(
    groups,
    family,
    appliedDecisions
  );
  const acceptedRequestIds = new Set(
    acceptedGroups.map((group) => reviewRequestIdForProjectedChildGroup(group))
  );
  const requests = groups
    .filter((group) => !acceptedRequestIds.has(reviewRequestIdForProjectedChildGroup(group)))
    .map((group) => projectedChildGroupReviewRequest(group, family));

  return {
    requests,
    acceptedGroups,
    appliedDecisions,
    diagnostics
  };
}

export function delegatedChildApplyPlan(
  state: DelegatedChildGroupReviewState,
  family: string
): DelegatedChildApplyPlan {
  const decisionByRequestId = new Map(
    state.appliedDecisions.map((decision) => [decision.requestId, decision] as const)
  );

  return {
    entries: state.acceptedGroups.flatMap((group) => {
      const requestId = reviewRequestIdForProjectedChildGroup(group);
      const decision = decisionByRequestId.get(requestId);

      if (!decision) {
        return [];
      }

      return [
        {
          requestId,
          family,
          delegatedGroup: group,
          decision
        }
      ];
    })
  };
}

export function resolveDelegatedChildOutputs(
  operations: readonly DelegatedChildOperation[],
  nestedOutputs: readonly DelegatedChildSurfaceOutput[],
  options: DelegatedChildOutputResolutionOptions
): DelegatedChildOutputResolution {
  const operationsBySurfaceAddress = new Map(
    operations.map((operation) => [operation.surface.address, operation] as const)
  );

  for (const nestedOutput of nestedOutputs) {
    if (!operationsBySurfaceAddress.has(nestedOutput.surfaceAddress)) {
      return {
        ok: false,
        diagnostics: [
          {
            severity: 'error',
            category: 'configuration_error',
            message: `missing delegated child surface ${nestedOutput.surfaceAddress}.`
          }
        ]
      };
    }
  }

  return {
    ok: true,
    diagnostics: [],
    applyPlan: {
      entries: nestedOutputs.map((nestedOutput, index) => {
        const operation = operationsBySurfaceAddress.get(nestedOutput.surfaceAddress)!;
        const requestId = `${options.requestIdPrefix}:${index}`;
        const family =
          typeof operation.surface.metadata?.family === 'string'
            ? operation.surface.metadata.family
            : options.defaultFamily;
        return {
          requestId,
          family,
          delegatedGroup: {
            delegatedApplyGroup: requestId,
            parentOperationId: operation.parentOperationId,
            childOperationId: operation.operationId,
            delegatedRuntimeSurfacePath: nestedOutput.surfaceAddress,
            caseIds: [],
            delegatedCaseIds: []
          },
          decision: {
            requestId,
            action: 'apply_delegated_child_group'
          }
        };
      })
    },
    appliedChildren: nestedOutputs.map((nestedOutput) => ({
      operationId: operationsBySurfaceAddress.get(nestedOutput.surfaceAddress)!.operationId,
      output: nestedOutput.output
    }))
  };
}

export function executeNestedMerge<TOutput>(
  nestedOutputs: readonly DelegatedChildSurfaceOutput[],
  options: DelegatedChildOutputResolutionOptions,
  callbacks: NestedMergeExecutionCallbacks<TOutput>
): MergeResult<TOutput> {
  const merged = callbacks.mergeParent();
  if (!merged.ok || merged.output === undefined) {
    return merged;
  }

  const discovery = callbacks.discoverOperations(merged.output);
  if (!discovery.ok || discovery.operations === undefined) {
    return {
      ok: false,
      diagnostics: discovery.diagnostics,
      policies: []
    };
  }

  const resolved = resolveDelegatedChildOutputs(discovery.operations, nestedOutputs, options);
  if (!resolved.ok || resolved.applyPlan === undefined || resolved.appliedChildren === undefined) {
    return {
      ok: false,
      diagnostics: resolved.diagnostics,
      policies: []
    };
  }

  return callbacks.applyResolvedOutputs(
    merged.output,
    discovery.operations,
    resolved.applyPlan,
    resolved.appliedChildren
  );
}

export function executeDelegatedChildApplyPlan<TOutput>(
  applyPlan: DelegatedChildApplyPlan,
  appliedChildren: readonly AppliedDelegatedChildOutput[],
  callbacks: NestedMergeExecutionCallbacks<TOutput>
): MergeResult<TOutput> {
  const merged = callbacks.mergeParent();
  if (!merged.ok || merged.output === undefined) {
    return merged;
  }

  const discovery = callbacks.discoverOperations(merged.output);
  if (!discovery.ok || discovery.operations === undefined) {
    return {
      ok: false,
      diagnostics: discovery.diagnostics,
      policies: []
    };
  }

  return callbacks.applyResolvedOutputs(
    merged.output,
    discovery.operations,
    applyPlan,
    appliedChildren
  );
}

export function executeReviewedNestedMerge<TOutput>(
  reviewState: DelegatedChildGroupReviewState,
  family: string,
  appliedChildren: readonly AppliedDelegatedChildOutput[],
  callbacks: NestedMergeExecutionCallbacks<TOutput>
): MergeResult<TOutput> {
  return executeDelegatedChildApplyPlan(
    delegatedChildApplyPlan(reviewState, family),
    appliedChildren,
    callbacks
  );
}

export function reviewedNestedExecution(
  family: string,
  reviewState: DelegatedChildGroupReviewState,
  appliedChildren: readonly AppliedDelegatedChildOutput[]
): ReviewedNestedExecution {
  return {
    family,
    reviewState,
    appliedChildren
  };
}

export function executeReviewedNestedExecution<TOutput>(
  execution: ReviewedNestedExecution,
  callbacks: NestedMergeExecutionCallbacks<TOutput>
): MergeResult<TOutput> {
  return executeReviewedNestedMerge(
    execution.reviewState,
    execution.family,
    execution.appliedChildren,
    callbacks
  );
}

export function executeReviewedNestedExecutions<TOutput>(
  executions: readonly ReviewedNestedExecution[],
  callbacksForExecution: (
    execution: ReviewedNestedExecution,
    index: number
  ) => NestedMergeExecutionCallbacks<TOutput>
): readonly ReviewedNestedExecutionResult<TOutput>[] {
  return executions.map((execution, index) => ({
    execution,
    result: executeReviewedNestedExecution(execution, callbacksForExecution(execution, index))
  }));
}

export function executeReviewReplayBundleReviewedNestedExecutions<TOutput>(
  replayBundle: ReviewReplayBundle,
  callbacksForExecution: (
    execution: ReviewedNestedExecution,
    index: number
  ) => NestedMergeExecutionCallbacks<TOutput>
): readonly ReviewedNestedExecutionResult<TOutput>[] {
  return executeReviewedNestedExecutions(
    replayBundle.reviewedNestedExecutions ?? [],
    callbacksForExecution
  );
}

export function executeReviewReplayBundleEnvelopeReviewedNestedExecutions<TOutput>(
  replayBundleEnvelope: unknown,
  callbacksForExecution: (
    execution: ReviewedNestedExecution,
    index: number
  ) => NestedMergeExecutionCallbacks<TOutput>
): ReviewedNestedExecutionApplication<TOutput> {
  const imported = importReviewReplayBundleEnvelope(replayBundleEnvelope);

  if (!imported.replayBundle) {
    return {
      diagnostics: [
        {
          severity: 'error',
          category: imported.error!.category,
          message: imported.error!.message
        }
      ],
      results: []
    };
  }

  return {
    diagnostics: [],
    results: executeReviewReplayBundleReviewedNestedExecutions(
      imported.replayBundle,
      callbacksForExecution
    )
  };
}

export function executeReviewStateReviewedNestedExecutions<TOutput>(
  state: ConformanceManifestReviewState,
  callbacksForExecution: (
    execution: ReviewedNestedExecution,
    index: number
  ) => NestedMergeExecutionCallbacks<TOutput>
): readonly ReviewedNestedExecutionResult<TOutput>[] {
  return executeReviewedNestedExecutions(
    state.reviewedNestedExecutions ?? [],
    callbacksForExecution
  );
}

export function executeReviewStateEnvelopeReviewedNestedExecutions<TOutput>(
  stateEnvelope: unknown,
  callbacksForExecution: (
    execution: ReviewedNestedExecution,
    index: number
  ) => NestedMergeExecutionCallbacks<TOutput>
): ReviewedNestedExecutionApplication<TOutput> {
  const imported = importConformanceManifestReviewStateEnvelope(stateEnvelope);

  if (!imported.state) {
    return {
      diagnostics: [
        {
          severity: 'error',
          category: imported.error!.category,
          message: imported.error!.message
        }
      ],
      results: []
    };
  }

  return {
    diagnostics: [],
    results: executeReviewStateReviewedNestedExecutions(imported.state, callbacksForExecution)
  };
}

export function conformanceManifestReplayContext(
  manifest: ConformanceManifest,
  options: ConformanceManifestReviewOptions
): ReviewReplayContext {
  const families: string[] = [];
  const seen = new Set<string>();
  for (const suiteSelector of conformanceSuiteSelectors(manifest)) {
    const definition = conformanceSuiteDefinition(manifest, suiteSelector);
    const family = definition?.subject.grammar;
    if (!family || seen.has(family)) {
      continue;
    }

    seen.add(family);
    families.push(family);
  }

  return {
    surface: 'conformance_manifest',
    families,
    requireExplicitContexts: options.requireExplicitContexts ?? false
  };
}

export function reviewReplayContextCompatible(
  current: ReviewReplayContext,
  candidate?: ReviewReplayContext
): boolean {
  return (
    candidate !== undefined &&
    candidate.surface === current.surface &&
    candidate.requireExplicitContexts === current.requireExplicitContexts &&
    candidate.families.length === current.families.length &&
    candidate.families.every((family, index) => family === current.families[index])
  );
}

export function reviewReplayBundleInputs(options: ConformanceManifestReviewOptions): {
  replayContext?: ReviewReplayContext;
  decisions: readonly ReviewDecision[];
  reviewedNestedExecutions: readonly ReviewedNestedExecution[];
} {
  if (options.reviewReplayBundle) {
    return {
      replayContext: options.reviewReplayBundle.replayContext,
      decisions: options.reviewReplayBundle.decisions,
      reviewedNestedExecutions: options.reviewReplayBundle.reviewedNestedExecutions ?? []
    };
  }

  return {
    replayContext: options.reviewReplayContext,
    decisions: options.reviewDecisions ?? [],
    reviewedNestedExecutions: []
  };
}

export function conformanceManifestReviewStateEnvelope(
  state: ConformanceManifestReviewState
): ConformanceManifestReviewStateEnvelope {
  return {
    kind: 'conformance_manifest_review_state',
    version: REVIEW_TRANSPORT_VERSION,
    state
  };
}

export function reviewReplayBundleEnvelope(
  replayBundle: ReviewReplayBundle
): ReviewReplayBundleEnvelope {
  return {
    kind: 'review_replay_bundle',
    version: REVIEW_TRANSPORT_VERSION,
    replayBundle
  };
}

export function reviewedNestedExecutionEnvelope(
  execution: ReviewedNestedExecution
): ReviewedNestedExecutionEnvelope {
  return {
    kind: 'reviewed_nested_execution',
    version: REVIEW_TRANSPORT_VERSION,
    execution
  };
}

export function importConformanceManifestReviewStateEnvelope(value: unknown): {
  state?: ConformanceManifestReviewState;
  error?: ReviewTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'conformance_manifest_review_state'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected conformance_manifest_review_state envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    state: ConformanceManifestReviewState;
  };

  if (envelope.version !== REVIEW_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported conformance_manifest_review_state envelope version ${String(envelope.version)}.`
      }
    };
  }

  return { state: envelope.state };
}

export function importReviewReplayBundleEnvelope(value: unknown): {
  replayBundle?: ReviewReplayBundle;
  error?: ReviewTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'review_replay_bundle'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected review_replay_bundle envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    replayBundle: ReviewReplayBundle;
  };

  if (envelope.version !== REVIEW_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported review_replay_bundle envelope version ${String(envelope.version)}.`
      }
    };
  }

  return { replayBundle: envelope.replayBundle };
}

export function importReviewedNestedExecutionEnvelope(value: unknown): {
  execution?: ReviewedNestedExecution;
  error?: ReviewTransportImportError;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { kind?: unknown }).kind !== 'reviewed_nested_execution'
  ) {
    return {
      error: {
        category: 'kind_mismatch',
        message: 'expected reviewed_nested_execution envelope kind.'
      }
    };
  }

  const envelope = value as {
    version?: unknown;
    execution: ReviewedNestedExecution;
  };

  if (envelope.version !== REVIEW_TRANSPORT_VERSION) {
    return {
      error: {
        category: 'unsupported_version',
        message: `unsupported reviewed_nested_execution envelope version ${String(envelope.version)}.`
      }
    };
  }

  return { execution: envelope.execution };
}

export function conformanceManifestReviewRequestIds(
  manifest: ConformanceManifest,
  options: ConformanceManifestReviewOptions
): readonly string[] {
  if (!(options.requireExplicitContexts ?? false)) {
    return [];
  }

  const requestIds = new Set<string>();

  for (const suiteSelector of conformanceSuiteSelectors(manifest)) {
    const family = suiteSelector.subject.grammar;

    if (options.contexts?.[family]) {
      continue;
    }

    if (options.familyProfiles?.[family]) {
      requestIds.add(reviewRequestIdForFamilyContext(family));
    }
  }

  return Array.from(requestIds).sort((left, right) => left.localeCompare(right));
}

export function resolveConformanceFamilyContext(
  family: string,
  options: ConformanceManifestPlanningOptions
): { context?: ConformanceFamilyPlanContext; diagnostics: readonly Diagnostic[] } {
  const explicitContext = options.contexts?.[family];

  if (explicitContext) {
    return {
      context: explicitContext,
      diagnostics: []
    };
  }

  if (options.requireExplicitContexts) {
    return {
      diagnostics: [
        {
          severity: 'error',
          category: 'configuration_error',
          message: `missing explicit family context for ${family}.`
        }
      ]
    };
  }

  const familyProfile = options.familyProfiles?.[family];

  if (!familyProfile) {
    return {
      diagnostics: [
        {
          severity: 'error',
          category: 'configuration_error',
          message: `missing family context for ${family} and no default family profile is available.`
        }
      ]
    };
  }

  return {
    context: defaultConformanceFamilyContext(familyProfile),
    diagnostics: [
      {
        severity: 'warning',
        category: 'assumed_default',
        message: `using default family context for ${family}.`
      }
    ]
  };
}

function reviewDecisionForFamilyContext(
  family: string,
  options: ConformanceManifestReviewOptions
):
  | {
      context?: ConformanceFamilyPlanContext;
      decision?: ReviewDecision;
      assumedDefault: boolean;
      diagnostics: readonly Diagnostic[];
    }
  | undefined {
  const requestId = reviewRequestIdForFamilyContext(family);
  const familyProfile = options.familyProfiles?.[family];

  for (const decision of options.reviewDecisions ?? []) {
    if (decision.requestId !== requestId) {
      continue;
    }

    if (decision.action === 'accept_default_context') {
      if (!familyProfile) {
        continue;
      }

      return {
        context: defaultConformanceFamilyContext(familyProfile),
        decision,
        assumedDefault: true,
        diagnostics: []
      };
    }

    if (decision.action === 'provide_explicit_context' && !decision.context) {
      return {
        assumedDefault: false,
        diagnostics: [
          {
            severity: 'error',
            category: 'configuration_error',
            message: `review decision ${requestId} requires explicit context payload.`,
            review: {
              requestId,
              action: 'provide_explicit_context',
              reason: 'missing_required_payload',
              payloadKind: 'conformance_family_context'
            }
          }
        ]
      };
    }

    if (decision.action === 'provide_explicit_context' && decision.context) {
      if (decision.context.familyProfile.family !== family) {
        return {
          assumedDefault: false,
          diagnostics: [
            {
              severity: 'error',
              category: 'configuration_error',
              message: `review decision ${requestId} provided context for ${decision.context.familyProfile.family}, expected ${family}.`,
              review: {
                requestId,
                action: 'provide_explicit_context',
                reason: 'family_mismatch',
                expectedFamily: family,
                providedFamily: decision.context.familyProfile.family
              }
            }
          ]
        };
      }

      return {
        context: decision.context,
        decision,
        assumedDefault: false,
        diagnostics: []
      };
    }
  }

  return undefined;
}

export function reviewConformanceFamilyContext(
  family: string,
  options: ConformanceManifestReviewOptions
): {
  context?: ConformanceFamilyPlanContext;
  diagnostics: readonly Diagnostic[];
  requests: readonly ReviewRequest[];
  appliedDecisions: readonly ReviewDecision[];
} {
  const explicitContext = options.contexts?.[family];

  if (explicitContext) {
    return {
      context: explicitContext,
      diagnostics: [],
      requests: [],
      appliedDecisions: []
    };
  }

  const familyProfile = options.familyProfiles?.[family];

  if (!(options.requireExplicitContexts ?? false)) {
    const resolved = resolveConformanceFamilyContext(family, options);
    return {
      context: resolved.context,
      diagnostics: resolved.diagnostics,
      requests: [],
      appliedDecisions: []
    };
  }

  if (!familyProfile) {
    return {
      diagnostics: [
        {
          severity: 'error',
          category: 'configuration_error',
          message: `missing family context for ${family} and no default family profile is available.`
        }
      ],
      requests: [],
      appliedDecisions: []
    };
  }

  const reviewedDecision = reviewDecisionForFamilyContext(family, options);

  if (reviewedDecision && reviewedDecision.context && reviewedDecision.decision) {
    return {
      context: reviewedDecision.context,
      diagnostics: reviewedDecision.assumedDefault
        ? [
            {
              severity: 'warning',
              category: 'assumed_default',
              message: `using default family context for ${family}.`
            }
          ]
        : [],
      requests: [],
      appliedDecisions: [reviewedDecision.decision]
    };
  }

  return {
    diagnostics:
      reviewedDecision && reviewedDecision.diagnostics.length > 0
        ? reviewedDecision.diagnostics
        : [
            {
              severity: 'error',
              category: 'configuration_error',
              message: `missing explicit family context for ${family}.`
            }
          ],
    requests: [
      {
        id: reviewRequestIdForFamilyContext(family),
        kind: 'family_context',
        family,
        message: `explicit family context is required for ${family}; a synthesized default may be accepted by review.`,
        blocking: true,
        proposedContext: defaultConformanceFamilyContext(familyProfile),
        actionOffers: [
          { action: 'accept_default_context', requiresContext: false },
          {
            action: 'provide_explicit_context',
            requiresContext: true,
            payloadKind: 'conformance_family_context'
          }
        ],
        defaultAction: 'accept_default_context'
      }
    ],
    appliedDecisions: []
  };
}

export function summarizeConformanceResults(
  results: readonly ConformanceCaseResult[]
): ConformanceSuiteSummary {
  return results.reduce<ConformanceSuiteSummary>(
    (summary, result) => ({
      total: summary.total + 1,
      passed: summary.passed + Number(result.outcome === 'passed'),
      failed: summary.failed + Number(result.outcome === 'failed'),
      skipped: summary.skipped + Number(result.outcome === 'skipped')
    }),
    {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    }
  );
}

export function selectConformanceCase(
  ref: ConformanceCaseRef,
  requirements: ConformanceCaseRequirements,
  familyProfile: FamilyFeatureProfile,
  featureProfile?: ConformanceFeatureProfileView
): ConformanceCaseSelection {
  const messages: string[] = [];

  if (requirements.backend) {
    if (!featureProfile) {
      messages.push(
        `case requires backend ${requirements.backend} but no backend feature profile is available for family ${familyProfile.family}.`
      );
    } else if (featureProfile.backend !== requirements.backend) {
      messages.push(
        `case requires backend ${requirements.backend} but backend ${featureProfile.backend} is active for family ${familyProfile.family}.`
      );
    }
  }

  if (requirements.dialect) {
    const { dialect } = requirements;

    if (!familyProfile.supportedDialects.includes(dialect)) {
      messages.push(`family ${familyProfile.family} does not support dialect ${dialect}.`);
    } else if (
      featureProfile &&
      !featureProfile.supportsDialects &&
      !isDefaultDialect(familyProfile, dialect)
    ) {
      messages.push(
        `backend ${featureProfile.backend} does not support dialect ${dialect} for family ${familyProfile.family}.`
      );
    }
  }

  for (const policy of requirements.policies ?? []) {
    if (!includesPolicy(familyProfile.supportedPolicies, policy)) {
      messages.push(`family ${familyProfile.family} does not support policy ${policy.name}.`);
      continue;
    }

    if (featureProfile && !includesPolicy(featureProfile.supportedPolicies ?? [], policy)) {
      messages.push(`backend ${featureProfile.backend} does not support policy ${policy.name}.`);
    }
  }

  return {
    ref,
    status: messages.length === 0 ? 'selected' : 'skipped',
    messages
  };
}

export function runConformanceCase(
  run: ConformanceCaseRun,
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution
): ConformanceCaseResult {
  const selection = selectConformanceCase(
    run.ref,
    run.requirements,
    run.familyProfile,
    run.featureProfile
  );

  if (selection.status === 'skipped') {
    return {
      ref: run.ref,
      outcome: 'skipped',
      messages: selection.messages
    };
  }

  const execution = execute(run);
  return {
    ref: run.ref,
    outcome: execution.outcome,
    messages: execution.messages
  };
}

export function runConformanceSuite(
  runs: readonly ConformanceCaseRun[],
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution
): readonly ConformanceCaseResult[] {
  return runs.map((run) => runConformanceCase(run, execute));
}

export function runPlannedConformanceSuite(
  plan: ConformanceSuitePlan,
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution
): readonly ConformanceCaseResult[] {
  return runConformanceSuite(
    plan.entries.map((entry) => entry.run),
    execute
  );
}

export function runNamedConformanceSuite(
  manifest: ConformanceManifest,
  suiteSelector: ConformanceSuiteSelector,
  familyProfile: FamilyFeatureProfile,
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution,
  featureProfile?: ConformanceFeatureProfileView
): readonly ConformanceCaseResult[] | undefined {
  const plan = planNamedConformanceSuite(manifest, suiteSelector, familyProfile, featureProfile);

  if (!plan) {
    return undefined;
  }

  return runPlannedConformanceSuite(plan, execute);
}

export function runNamedConformanceSuiteEntry(
  manifest: ConformanceManifest,
  suiteSelector: ConformanceSuiteSelector,
  familyProfile: FamilyFeatureProfile,
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution,
  featureProfile?: ConformanceFeatureProfileView
): NamedConformanceSuiteResults | undefined {
  const results = runNamedConformanceSuite(
    manifest,
    suiteSelector,
    familyProfile,
    execute,
    featureProfile
  );

  if (!results) {
    return undefined;
  }

  return {
    suite: conformanceSuiteDefinition(manifest, suiteSelector)!,
    results
  };
}

export function runPlannedNamedConformanceSuites(
  entries: readonly NamedConformanceSuitePlan[],
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution
): readonly NamedConformanceSuiteResults[] {
  return entries.map((entry) => ({
    suite: entry.suite,
    results: runPlannedConformanceSuite(entry.plan, execute)
  }));
}

export function reportPlannedConformanceSuite(
  plan: ConformanceSuitePlan,
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution
): ConformanceSuiteReport {
  return reportConformanceSuite(runPlannedConformanceSuite(plan, execute));
}

export function reportNamedConformanceSuite(
  manifest: ConformanceManifest,
  suiteSelector: ConformanceSuiteSelector,
  familyProfile: FamilyFeatureProfile,
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution,
  featureProfile?: ConformanceFeatureProfileView
): ConformanceSuiteReport | undefined {
  const plan = planNamedConformanceSuite(manifest, suiteSelector, familyProfile, featureProfile);

  if (!plan) {
    return undefined;
  }

  return reportPlannedConformanceSuite(plan, execute);
}

export function reportNamedConformanceSuiteEntry(
  manifest: ConformanceManifest,
  suiteSelector: ConformanceSuiteSelector,
  familyProfile: FamilyFeatureProfile,
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution,
  featureProfile?: ConformanceFeatureProfileView
): NamedConformanceSuiteReport | undefined {
  const report = reportNamedConformanceSuite(
    manifest,
    suiteSelector,
    familyProfile,
    execute,
    featureProfile
  );

  if (!report) {
    return undefined;
  }

  return {
    suite: conformanceSuiteDefinition(manifest, suiteSelector)!,
    report
  };
}

export function reportPlannedNamedConformanceSuites(
  entries: readonly NamedConformanceSuitePlan[],
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution
): readonly NamedConformanceSuiteReport[] {
  return entries.map((entry) => ({
    suite: entry.suite,
    report: reportPlannedConformanceSuite(entry.plan, execute)
  }));
}

export function summarizeNamedConformanceSuiteReports(
  entries: readonly NamedConformanceSuiteReport[]
): ConformanceSuiteSummary {
  return entries.reduce<ConformanceSuiteSummary>(
    (summary, entry) => ({
      total: summary.total + entry.report.summary.total,
      passed: summary.passed + entry.report.summary.passed,
      failed: summary.failed + entry.report.summary.failed,
      skipped: summary.skipped + entry.report.summary.skipped
    }),
    {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    }
  );
}

export function reportNamedConformanceSuiteEnvelope(
  entries: readonly NamedConformanceSuiteReport[]
): NamedConformanceSuiteReportEnvelope {
  return {
    entries,
    summary: summarizeNamedConformanceSuiteReports(entries)
  };
}

export function reportNamedConformanceSuiteManifest(
  manifest: ConformanceManifest,
  contexts: Readonly<Record<string, ConformanceFamilyPlanContext>>,
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution
): NamedConformanceSuiteReportEnvelope {
  return reportNamedConformanceSuiteEnvelope(
    reportPlannedNamedConformanceSuites(planNamedConformanceSuites(manifest, contexts), execute)
  );
}

export function reportConformanceSuite(
  results: readonly ConformanceCaseResult[]
): ConformanceSuiteReport {
  return {
    results,
    summary: summarizeConformanceResults(results)
  };
}

export function planConformanceSuite(
  manifest: ConformanceManifest,
  family: string,
  roles: readonly string[],
  familyProfile: FamilyFeatureProfile,
  featureProfile?: ConformanceFeatureProfileView
): ConformanceSuitePlan {
  const entries: ConformanceSuitePlanEntry[] = [];
  const missingRoles: string[] = [];

  for (const role of roles) {
    const entry = conformanceFamilyEntries(manifest, family).find(
      (manifestEntry) => manifestEntry.role === role
    );

    if (!entry) {
      missingRoles.push(role);
      continue;
    }

    const ref: ConformanceCaseRef = {
      family,
      role,
      case: role
    };

    entries.push({
      ref,
      path: entry.path,
      run: {
        ref,
        requirements: entry.requirements ?? {},
        familyProfile,
        featureProfile
      }
    });
  }

  return {
    family,
    entries,
    missingRoles
  };
}

export function planNamedConformanceSuite(
  manifest: ConformanceManifest,
  suiteSelector: ConformanceSuiteSelector,
  familyProfile: FamilyFeatureProfile,
  featureProfile?: ConformanceFeatureProfileView
): ConformanceSuitePlan | undefined {
  const definition = conformanceSuiteDefinition(manifest, suiteSelector);

  if (!definition) {
    return undefined;
  }

  return planConformanceSuite(
    manifest,
    definition.subject.grammar,
    definition.roles,
    familyProfile,
    featureProfile
  );
}

export function planNamedConformanceSuiteEntry(
  manifest: ConformanceManifest,
  suiteSelector: ConformanceSuiteSelector,
  context: ConformanceFamilyPlanContext
): NamedConformanceSuitePlan | undefined {
  const plan = planNamedConformanceSuite(
    manifest,
    suiteSelector,
    context.familyProfile,
    context.featureProfile
  );

  if (!plan) {
    return undefined;
  }

  return {
    suite: conformanceSuiteDefinition(manifest, suiteSelector)!,
    plan
  };
}

export function planNamedConformanceSuitesWithDiagnostics(
  manifest: ConformanceManifest,
  options: ConformanceManifestPlanningOptions
): { entries: readonly NamedConformanceSuitePlan[]; diagnostics: readonly Diagnostic[] } {
  const entries: NamedConformanceSuitePlan[] = [];
  const diagnostics: Diagnostic[] = [];
  const resolvedContexts = new Map<string, ConformanceFamilyPlanContext | undefined>();

  for (const suiteSelector of conformanceSuiteSelectors(manifest)) {
    const definition = conformanceSuiteDefinition(manifest, suiteSelector);

    if (!definition) {
      continue;
    }

    let context = resolvedContexts.get(definition.subject.grammar);

    if (context === undefined && !resolvedContexts.has(definition.subject.grammar)) {
      const resolved = resolveConformanceFamilyContext(definition.subject.grammar, options);
      diagnostics.push(...resolved.diagnostics);
      context = resolved.context;
      resolvedContexts.set(definition.subject.grammar, context);
    }

    if (!context) {
      continue;
    }

    const plan = planNamedConformanceSuiteEntry(manifest, suiteSelector, context);

    if (!plan) {
      continue;
    }

    if (plan.plan.missingRoles.length > 0) {
      diagnostics.push({
        severity: 'error',
        category: 'configuration_error',
        message: `suite ${JSON.stringify(plan.suite)} declares missing roles: ${plan.plan.missingRoles.join(', ')}.`
      });
      continue;
    }

    entries.push(plan);
  }

  return {
    entries,
    diagnostics
  };
}

export function planNamedConformanceSuites(
  manifest: ConformanceManifest,
  contexts: Readonly<Record<string, ConformanceFamilyPlanContext>>
): readonly NamedConformanceSuitePlan[] {
  return conformanceSuiteSelectors(manifest)
    .map((suiteSelector) => {
      const definition = conformanceSuiteDefinition(manifest, suiteSelector);

      if (!definition) {
        return undefined;
      }

      const context = contexts[definition.subject.grammar];

      if (!context) {
        return undefined;
      }

      return planNamedConformanceSuiteEntry(manifest, suiteSelector, context);
    })
    .filter((entry): entry is NamedConformanceSuitePlan => entry !== undefined);
}

export function reportConformanceManifest(
  manifest: ConformanceManifest,
  options: ConformanceManifestPlanningOptions,
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution
): ConformanceManifestReport {
  const planned = planNamedConformanceSuitesWithDiagnostics(manifest, options);

  return {
    report: reportNamedConformanceSuiteEnvelope(
      reportPlannedNamedConformanceSuites(planned.entries, execute)
    ),
    diagnostics: planned.diagnostics
  };
}

export function reviewConformanceManifest(
  manifest: ConformanceManifest,
  options: ConformanceManifestReviewOptions,
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution
): ConformanceManifestReviewState {
  const replayContext = conformanceManifestReplayContext(manifest, options);
  const diagnostics: Diagnostic[] = [];
  let effectiveOptions: ConformanceManifestReviewOptions = options;
  const replayInputs = reviewReplayBundleInputs(options);
  let reviewedNestedExecutions = [...replayInputs.reviewedNestedExecutions];

  if (replayInputs.decisions.length > 0) {
    if (!replayInputs.replayContext) {
      diagnostics.push({
        severity: 'error',
        category: 'replay_rejected',
        message: 'review decisions were provided without replay context.'
      });
      effectiveOptions = {
        ...options,
        reviewReplayBundle: undefined,
        reviewReplayContext: undefined,
        reviewDecisions: []
      };
      reviewedNestedExecutions = [];
    } else if (!reviewReplayContextCompatible(replayContext, replayInputs.replayContext)) {
      diagnostics.push({
        severity: 'error',
        category: 'replay_rejected',
        message: 'review replay context does not match the current conformance manifest state.'
      });
      effectiveOptions = {
        ...options,
        reviewReplayBundle: undefined,
        reviewReplayContext: undefined,
        reviewDecisions: []
      };
      reviewedNestedExecutions = [];
    } else {
      const allowedRequestIds = new Set(conformanceManifestReviewRequestIds(manifest, options));
      const acceptedDecisions: ReviewDecision[] = [];

      for (const decision of replayInputs.decisions) {
        if (allowedRequestIds.has(decision.requestId)) {
          acceptedDecisions.push(decision);
        } else {
          diagnostics.push({
            severity: 'error',
            category: 'replay_rejected',
            message: `review decision ${decision.requestId} does not match any current review request.`,
            review: {
              requestId: decision.requestId,
              action: decision.action,
              reason: 'request_not_found'
            }
          });
        }
      }

      effectiveOptions = {
        ...options,
        reviewReplayBundle: undefined,
        reviewReplayContext: replayInputs.replayContext,
        reviewDecisions: acceptedDecisions
      };
    }
  }

  const entries: NamedConformanceSuitePlan[] = [];
  const requests: ReviewRequest[] = [];
  const appliedDecisions: ReviewDecision[] = [];
  const resolvedContexts = new Map<string, ConformanceFamilyPlanContext | undefined>();

  for (const suiteSelector of conformanceSuiteSelectors(manifest)) {
    const definition = conformanceSuiteDefinition(manifest, suiteSelector);

    if (!definition) {
      continue;
    }

    let context = resolvedContexts.get(definition.subject.grammar);

    if (context === undefined && !resolvedContexts.has(definition.subject.grammar)) {
      const reviewed = reviewConformanceFamilyContext(definition.subject.grammar, effectiveOptions);
      diagnostics.push(...reviewed.diagnostics);
      requests.push(...reviewed.requests);
      appliedDecisions.push(...reviewed.appliedDecisions);
      context = reviewed.context;
      resolvedContexts.set(definition.subject.grammar, context);
    }

    if (!context) {
      continue;
    }

    const plan = planNamedConformanceSuiteEntry(manifest, suiteSelector, context);

    if (!plan) {
      continue;
    }

    if (plan.plan.missingRoles.length > 0) {
      diagnostics.push({
        severity: 'error',
        category: 'configuration_error',
        message: `suite ${JSON.stringify(plan.suite)} declares missing roles: ${plan.plan.missingRoles.join(', ')}.`
      });
      continue;
    }

    entries.push(plan);
  }

  return {
    report: reportNamedConformanceSuiteEnvelope(
      reportPlannedNamedConformanceSuites(entries, execute)
    ),
    diagnostics,
    requests,
    appliedDecisions,
    hostHints: conformanceReviewHostHints(options),
    replayContext,
    ...(reviewedNestedExecutions.length > 0 ? { reviewedNestedExecutions } : {})
  };
}

export function reviewConformanceManifestWithReplayBundleEnvelope(
  manifest: ConformanceManifest,
  options: ConformanceManifestReviewOptions,
  replayBundleEnvelope: unknown,
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution
): ConformanceManifestReviewState {
  const imported = importReviewReplayBundleEnvelope(replayBundleEnvelope);

  if (imported.replayBundle) {
    return reviewConformanceManifest(
      manifest,
      {
        ...options,
        reviewReplayBundle: imported.replayBundle
      },
      execute
    );
  }

  const state = reviewConformanceManifest(
    manifest,
    {
      ...options,
      reviewReplayBundle: undefined
    },
    execute
  );

  return {
    ...state,
    diagnostics: [
      ...state.diagnostics,
      {
        severity: 'error',
        category: imported.error!.category,
        message: imported.error!.message
      }
    ]
  };
}

export function reviewAndExecuteConformanceManifestWithReplayBundleEnvelope<TOutput>(
  manifest: ConformanceManifest,
  options: ConformanceManifestReviewOptions,
  replayBundleEnvelope: unknown,
  execute: (run: ConformanceCaseRun) => ConformanceCaseExecution,
  callbacksForExecution: (
    execution: ReviewedNestedExecution,
    index: number
  ) => NestedMergeExecutionCallbacks<TOutput>
): ConformanceManifestReviewedNestedApplication<TOutput> {
  const state = reviewConformanceManifestWithReplayBundleEnvelope(
    manifest,
    options,
    replayBundleEnvelope,
    execute
  );

  return {
    state,
    results: executeReviewStateReviewedNestedExecutions(state, callbacksForExecution)
  };
}

function suiteSelectorsEqual(
  left: ConformanceSuiteSelector,
  right: ConformanceSuiteSelector
): boolean {
  return (
    left.kind === right.kind &&
    left.subject.grammar === right.subject.grammar &&
    left.subject.variant === right.subject.variant
  );
}

function isSuiteDefinition(value: unknown): value is ConformanceSuiteDefinition {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { kind?: unknown }).kind === 'string' &&
    typeof (value as { subject?: { grammar?: unknown } }).subject?.grammar === 'string' &&
    Array.isArray((value as { roles?: unknown }).roles)
  );
}

function compareSuiteSelectors(
  left: ConformanceSuiteSelector,
  right: ConformanceSuiteSelector
): number {
  const leftKey = `${left.kind}:${left.subject.grammar}:${left.subject.variant ?? ''}`;
  const rightKey = `${right.kind}:${right.subject.grammar}:${right.subject.variant ?? ''}`;
  return leftKey.localeCompare(rightKey);
}
