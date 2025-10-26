import jsPDF from 'jspdf';
import type { AuditReport, VulnerabilitySeverity } from '@/functions/auditInit';
import { summarizeVulnerabilities, calculateRiskScore } from '@/functions/auditInit';

interface PDFTheme {
  colors: {
    primary: string;
    secondary: string;
    danger: string;
    warning: string;
    caution: string;
    info: string;
    success: string;
    text: string;
    lightGray: string;
  };
}

const theme: PDFTheme = {
  colors: {
    primary: '#1a73e8',
    secondary: '#5f6368',
    danger: '#dc3545',
    warning: '#ff9800',
    caution: '#ffc107',
    info: '#2196f3',
    success: '#4caf50',
    text: '#202124',
    lightGray: '#f8f9fa'
  }
};

export function generateAuditReportPDF(report: AuditReport, userEmail?: string): void {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const lineHeight = 7;
  let yPosition = margin;

  // Helper functions
  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  const drawSeverityBadge = (severity: VulnerabilitySeverity, x: number, y: number) => {
    const colors = {
      CRITICAL: theme.colors.danger,
      HIGH: theme.colors.warning,
      MEDIUM: theme.colors.caution,
      LOW: theme.colors.info
    };
    
    pdf.setFillColor(colors[severity]);
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    const text = severity;
    const textWidth = pdf.getTextWidth(text);
    pdf.roundedRect(x, y - 5, textWidth + 8, 6, 1, 1, 'F');
    pdf.text(text, x + 4, y - 1);
    pdf.setTextColor(0, 0, 0);
  };

  // Title Page
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(theme.colors.primary);
  pdf.text('Smart Contract', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += lineHeight + 2;
  pdf.text('Security Audit Report', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += lineHeight * 3;
  
  // Contract Info Box
  pdf.setDrawColor(200, 200, 200);
  pdf.setFillColor(theme.colors.lightGray);
  pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 50, 3, 3, 'FD');
  
  yPosition += 10;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(theme.colors.text);
  pdf.text(`Contract: ${report.contractName}`, margin + 10, yPosition);
  yPosition += lineHeight;
  pdf.text(`Language: ${report.language}`, margin + 10, yPosition);
  yPosition += lineHeight;
  pdf.text(`Lines of Code: ${report.linesOfCode || 'N/A'}`, margin + 10, yPosition);
  yPosition += lineHeight;
  pdf.text(`Audit Date: ${report.auditedAt.toLocaleString()}`, margin + 10, yPosition);
  yPosition += lineHeight;
  if (userEmail) {
    pdf.text(`Audited by: ${userEmail}`, margin + 10, yPosition);
  }
  
  yPosition += 20;

  // Executive Summary
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(theme.colors.primary);
  pdf.text('Executive Summary', margin, yPosition);
  yPosition += lineHeight + 2;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(theme.colors.text);
  const summaryLines = pdf.splitTextToSize(report.summary, pageWidth - 2 * margin);
  summaryLines.forEach((line: string) => {
    addNewPageIfNeeded(lineHeight);
    pdf.text(line, margin, yPosition);
    yPosition += lineHeight - 1;
  });
  
  yPosition += lineHeight;

  // Risk Analysis
  const summary = summarizeVulnerabilities(report);
  const riskScore = calculateRiskScore(report);
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(theme.colors.primary);
  pdf.text('Risk Analysis', margin, yPosition);
  yPosition += lineHeight + 2;
  
  // Risk Score Bar
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Overall Risk Score: ${riskScore}/100`, margin, yPosition);
  yPosition += 8;
  
  // Draw risk score bar
  const barWidth = pageWidth - 2 * margin;
  const barHeight = 10;
  pdf.setDrawColor(200, 200, 200);
  pdf.rect(margin, yPosition, barWidth, barHeight);
  
  // Fill based on score
  const fillColor = riskScore >= 75 ? theme.colors.danger : 
                   riskScore >= 50 ? theme.colors.warning : 
                   riskScore >= 25 ? theme.colors.caution : theme.colors.success;
  pdf.setFillColor(fillColor);
  pdf.rect(margin, yPosition, (barWidth * riskScore) / 100, barHeight, 'F');
  
  yPosition += barHeight + 10;

  // Vulnerability Summary Table
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Vulnerability Summary', margin, yPosition);
  yPosition += lineHeight + 2;
  
  // Draw summary boxes
  const boxWidth = (pageWidth - 2 * margin - 15) / 4;
  const boxHeight = 25;
  const severities: VulnerabilitySeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const colors = [theme.colors.danger, theme.colors.warning, theme.colors.caution, theme.colors.info];
  
  severities.forEach((severity, index) => {
    const x = margin + index * (boxWidth + 5);
    
    // Box
    pdf.setFillColor(colors[index]);
    pdf.setDrawColor(colors[index]);
    pdf.roundedRect(x, yPosition, boxWidth, boxHeight, 2, 2, 'FD');
    
    // Count
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(summary[severity].toString(), x + boxWidth / 2, yPosition + 12, { align: 'center' });
    
    // Label
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(severity, x + boxWidth / 2, yPosition + 20, { align: 'center' });
  });
  
  pdf.setTextColor(theme.colors.text);
  yPosition += boxHeight + 15;

  // Detailed Vulnerabilities
  if (report.vulnerabilities.length > 0) {
    addNewPageIfNeeded(20);
    
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(theme.colors.primary);
    pdf.text('Detailed Findings', margin, yPosition);
    yPosition += lineHeight + 3;
    
    report.vulnerabilities.forEach((vuln, index) => {
      addNewPageIfNeeded(40);
      
      // Vulnerability header
      pdf.setFillColor(theme.colors.lightGray);
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F');
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(theme.colors.text);
      pdf.text(`${index + 1}. ${vuln.title}`, margin + 3, yPosition + 5);
      
      // Severity badge
      drawSeverityBadge(vuln.severity, pageWidth - margin - 40, yPosition + 5);
      
      yPosition += 12;
      
      // Details
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      if (vuln.category) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Category: ', margin + 5, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(vuln.category, margin + 28, yPosition);
        yPosition += lineHeight;
      }
      
      if (vuln.function) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Function: ', margin + 5, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(vuln.function, margin + 26, yPosition);
        yPosition += lineHeight;
      }
      
      if (vuln.lines && vuln.lines.length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Lines: ', margin + 5, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(vuln.lines.join(', '), margin + 20, yPosition);
        yPosition += lineHeight;
      }
      
      yPosition += 3;
      
      // Description
      pdf.setFont('helvetica', 'bold');
      pdf.text('Description:', margin + 5, yPosition);
      yPosition += lineHeight;
      
      pdf.setFont('helvetica', 'normal');
      const descLines = pdf.splitTextToSize(vuln.description, pageWidth - 2 * margin - 10);
      descLines.forEach((line: string) => {
        addNewPageIfNeeded(lineHeight);
        pdf.text(line, margin + 5, yPosition);
        yPosition += lineHeight - 1;
      });
      
      yPosition += 3;
      
      // Recommendation
      pdf.setFont('helvetica', 'bold');
      pdf.text('Recommendation:', margin + 5, yPosition);
      yPosition += lineHeight;
      
      pdf.setFont('helvetica', 'normal');
      const recLines = pdf.splitTextToSize(vuln.recommendation, pageWidth - 2 * margin - 10);
      recLines.forEach((line: string) => {
        addNewPageIfNeeded(lineHeight);
        pdf.text(line, margin + 5, yPosition);
        yPosition += lineHeight - 1;
      });
      
      yPosition += 10;
    });
  }

  // Footer on last page
  addNewPageIfNeeded(20);
  yPosition = pageHeight - 15;
  pdf.setFontSize(8);
  pdf.setTextColor(theme.colors.secondary);
  pdf.text('Generated by Brisingr - Smart Contract Security Audit Platform', pageWidth / 2, yPosition, { align: 'center' });
  pdf.text(`Report generated on ${new Date().toLocaleString()}`, pageWidth / 2, yPosition + 4, { align: 'center' });

  // Save the PDF
  const filename = `${report.contractName.replace(/[^a-z0-9]/gi, '_')}_audit_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
}
