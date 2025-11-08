import mongoose, { Schema, Document } from 'mongoose';
import type { Vulnerability, VulnerabilitySeverity, ContractLanguage } from '@/functions/auditInit';

export interface IAuditReport extends Document {
  userEmail: string;
  contractName: string;
  language: ContractLanguage;
  summary: string;
  vulnerabilities: Vulnerability[];
  linesOfCode?: number;
  auditedAt: Date;
  auditEngineVersion?: string;
  rawResponse?: unknown;
  requestId?: string;
  auditDuration?: number;
  riskScore?: number; // Risk score from 0-100 (calculated from vulnerabilities)
  originalAuditId?: string; // Reference to original audit if this is a re-audit
  isReAudit?: boolean; // Whether this is a re-audit of an improved contract
  createdAt: Date;
  updatedAt: Date;
}

const VulnerabilitySchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  severity: { 
    type: String, 
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    required: true 
  },
  recommendation: { type: String, required: true },
  function: { type: String },
  lines: { type: [Number] },
  category: { type: String },
}, { _id: false });

const AuditReportSchema = new Schema(
  {
    userEmail: { 
      type: String, 
      required: true,
      index: true // Index for faster queries by user
    },
    contractName: { 
      type: String, 
      required: true,
      index: true // Index for searching by contract name
    },
    language: { 
      type: String, 
      enum: ['Solidity', 'Vyper', 'Unknown'],
      required: true 
    },
    summary: { type: String, required: true },
    vulnerabilities: { 
      type: [VulnerabilitySchema], 
      required: true,
      default: [] 
    },
    linesOfCode: { type: Number },
    auditedAt: { 
      type: Date, 
      required: true,
      index: true // Index for sorting by date
    },
    auditEngineVersion: { type: String },
    rawResponse: { type: Schema.Types.Mixed },
    requestId: { type: String },
    auditDuration: { type: Number },
    riskScore: { type: Number, min: 0, max: 100 },
    originalAuditId: { 
      type: Schema.Types.ObjectId, 
      ref: 'AuditReport',
      index: true // Index for faster queries
    },
    isReAudit: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Compound index for user email and date (for efficient user history queries)
AuditReportSchema.index({ userEmail: 1, auditedAt: -1 });

// Create model if it doesn't exist, otherwise use existing
const AuditReport = mongoose.models.AuditReport || mongoose.model<IAuditReport>('AuditReport', AuditReportSchema);

export default AuditReport;

