import jsPDF from 'jspdf';
import type { AuditReport, VulnerabilitySeverity } from '@/functions/auditInit';
import { summarizeVulnerabilities, calculateRiskScore } from '@/functions/auditInit';

interface PDFTheme {
  colors: {
    primary: string;
    secondary: string;
    energiGreen: string;
    danger: string;
    warning: string;
    caution: string;
    info: string;
    success: string;
    text: string;
    lightGray: string;
    darkGray: string;
    gold: string;
  };
}

const theme: PDFTheme = {
  colors: {
    primary: '#00d56a',  // Energi green
    secondary: '#5f6368',
    energiGreen: '#00d56a',
    danger: '#ef4444',
    warning: '#f97316',
    caution: '#eab308',
    info: '#3b82f6',
    success: '#10b981',
    text: '#0a0a0a',
    lightGray: '#f5f5f5',
    darkGray: '#374151',
    gold: '#fbbf24'
  }
};

export function generateAuditReportPDF(report: AuditReport, userEmail?: string): void {
  try {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 7;
    let yPosition = margin;
    let pageNumber = 1;

    // Helper functions
    const addNewPageIfNeeded = (requiredSpace: number) => {
      if (yPosition + requiredSpace > pageHeight - margin - 15) {
        addFooter();
        pdf.addPage();
        pageNumber++;
        addHeader();
        yPosition = margin + 20;
        return true;
      }
      return false;
    };

    const addHeader = () => {
      if (pageNumber === 1) return;
      
      pdf.setDrawColor('#00d56a');
      pdf.setLineWidth(0.5);
      pdf.line(margin, 15, pageWidth - margin, 15);
      
      pdf.setFontSize(8);
      pdf.setTextColor('#374151');
      pdf.setFont('helvetica', 'normal');
      pdf.text('Energi × ChainGPT Security Audit', margin, 12);
      pdf.text(report.contractName, pageWidth - margin, 12, { align: 'right' });
    };

    const addFooter = () => {
      const footerY = pageHeight - 10;
      
      pdf.setFontSize(8);
      pdf.setTextColor('#5f6368');
      pdf.text(`Page ${pageNumber}`, pageWidth / 2, footerY, { align: 'center' });
      
      pdf.setDrawColor('#00d56a');
      pdf.setLineWidth(0.5);
      pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
    };

    const drawVerificationBadge = (x: number, y: number, width: number, height: number) => {
      // Gold outer border
      pdf.setDrawColor(251, 191, 36);
      pdf.setLineWidth(1.5);
      pdf.roundedRect(x, y, width, height, 3, 3, 'S');
      
      // White inner fill
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(x + 2, y + 2, width - 4, height - 4, 2, 2, 'F');
      
      // Green checkmark circle - filled properly
      pdf.setFillColor(0, 213, 106);
      pdf.circle(x + width / 2, y + 10, 8, 'F');
      
      // White checkmark
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('✓', x + width / 2, y + 13, { align: 'center' });
      
      // "VERIFIED AUDIT" text
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('VERIFIED AUDIT', x + width / 2, y + 23, { align: 'center' });
      
      // "Blockchain Security" text
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text('Blockchain Security', x + width / 2, y + 28, { align: 'center' });
    };

    const drawSeverityBadge = (severity: VulnerabilitySeverity, rightX: number, y: number) => {
      const colors = {
        CRITICAL: [239, 68, 68],
        HIGH: [249, 115, 22],
        MEDIUM: [234, 179, 8],
        LOW: [59, 130, 246]
      };
      
      const color = colors[severity];
      pdf.setFillColor(color[0], color[1], color[2]);
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      const text = severity;
      const textWidth = pdf.getTextWidth(text);
      const badgeWidth = textWidth + 10;
      // Right-aligned badge
      pdf.roundedRect(rightX - badgeWidth, y - 5, badgeWidth, 7, 2, 2, 'F');
      pdf.text(text, rightX - badgeWidth + 5, y - 1);
      pdf.setTextColor(0, 0, 0);
    };

    // ============================================
    // COVER PAGE
    // ============================================
    
    pdf.setFillColor(250, 250, 250);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    
    pdf.setFillColor(0, 213, 106);
    pdf.setGState(new pdf.GState({ opacity: 0.1 }));
    pdf.circle(pageWidth - 20, 20, 60, 'F');
    pdf.circle(20, pageHeight - 20, 40, 'F');
    pdf.setGState(new pdf.GState({ opacity: 1 }));
    
    yPosition = 35;
    
    pdf.setFontSize(10);
    pdf.setTextColor('#374151');
    pdf.setFont('helvetica', 'normal');
    pdf.text('Powered by', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;
    
    // Try to add logos (note: jsPDF doesn't support SVG directly, so we use text as fallback)
    // In a production environment, you'd convert SVG to PNG/JPEG
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor('#00d56a');
    pdf.text('ENERGI', pageWidth / 2 - 22, yPosition, { align: 'center' });
    
    pdf.setFontSize(14);
    pdf.setTextColor('#00d56a');
    pdf.text('×', pageWidth / 2, yPosition);
    
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor('#4a9eff');
    pdf.text('ChainGPT', pageWidth / 2 + 26, yPosition, { align: 'center' });
    
    yPosition += 25;
    
    pdf.setDrawColor('#00d56a');
    pdf.setLineWidth(2);
    pdf.line(40, yPosition, pageWidth - 40, yPosition);
    yPosition += 15;
    
    pdf.setFontSize(32);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor('#0a0a0a');
    pdf.text('SMART CONTRACT', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 12;
    pdf.text('SECURITY AUDIT', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;
    
    pdf.setDrawColor('#00d56a');
    pdf.setLineWidth(2);
    pdf.line(40, yPosition, pageWidth - 40, yPosition);
    
    yPosition += 20;
    
    drawVerificationBadge(pageWidth / 2 - 30, yPosition, 60, 35);
    yPosition += 50;
    
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor('#00d56a');
    pdf.setLineWidth(1);
    pdf.roundedRect(30, yPosition, pageWidth - 60, 70, 5, 5, 'FD');
    
    yPosition += 15;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor('#00d56a');
    pdf.text('CONTRACT DETAILS', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 12;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor('#0a0a0a');
    
    // Handle auditedAt - it might be a Date or a string
    const auditDate = report.auditedAt instanceof Date 
      ? report.auditedAt 
      : new Date(report.auditedAt);
    
    const contractDetails = [
      `Contract Name: ${report.contractName}`,
      `Language: ${report.language}`,
      `Lines of Code: ${report.linesOfCode || 'N/A'}`,
      `Audit Date: ${auditDate.toLocaleDateString()}`
    ];
    
    contractDetails.forEach(detail => {
      pdf.text(detail, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 7;
    });
    
    yPosition = pageHeight - 60;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor('#374151');
    const reportId = `AUDIT-${Date.now().toString(36).toUpperCase()}`;
    pdf.text(`Report ID: ${reportId}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 6;
    pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });
    if (userEmail) {
      yPosition += 6;
      pdf.text(`Requested by: ${userEmail}`, pageWidth / 2, yPosition, { align: 'center' });
    }
    
    yPosition += 15;
    pdf.setFontSize(7);
    pdf.setTextColor('#5f6368');
    const disclaimer = 'This report is confidential and intended solely for the use of the individual or entity to whom it is addressed.';
    const disclaimerLines = pdf.splitTextToSize(disclaimer, pageWidth - 60);
    disclaimerLines.forEach((line: string) => {
      pdf.text(line, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 4;
    });

    // ============================================
    // PAGE 2: EXECUTIVE SUMMARY
    // ============================================
    pdf.addPage();
    pageNumber++;
    addHeader();
    yPosition = margin + 20;
    
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor('#00d56a');
    pdf.text('EXECUTIVE SUMMARY', margin, yPosition);
    yPosition += 4;
    
    pdf.setDrawColor('#00d56a');
    pdf.setLineWidth(1);
    pdf.line(margin, yPosition, margin + 60, yPosition);
    yPosition += 12;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor('#0a0a0a');
    const summaryLines = pdf.splitTextToSize(report.summary, pageWidth - 2 * margin);
    summaryLines.forEach((line: string) => {
      addNewPageIfNeeded(lineHeight);
      pdf.text(line, margin, yPosition);
      yPosition += lineHeight;
    });
    
    yPosition += 10;

    // ============================================
    // RISK ANALYSIS
    // ============================================
    addNewPageIfNeeded(80);
    
    const summary = summarizeVulnerabilities(report);
    const riskScore = calculateRiskScore(report);
    
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor('#00d56a');
    pdf.text('RISK ANALYSIS', margin, yPosition);
    yPosition += 15;
    
    pdf.setFillColor(245, 245, 245);
    pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 35, 3, 3, 'F');
    
    yPosition += 12;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor('#0a0a0a');
    pdf.text('OVERALL RISK SCORE', margin + 10, yPosition);
    
    const scoreColorRGB = riskScore >= 75 ? [239, 68, 68] : 
                          riskScore >= 50 ? [249, 115, 22] : 
                          riskScore >= 25 ? [234, 179, 8] : [16, 185, 129];
    pdf.setFontSize(28);
    pdf.setTextColor(scoreColorRGB[0], scoreColorRGB[1], scoreColorRGB[2]);
    pdf.text(`${riskScore}/100`, pageWidth - margin - 30, yPosition + 5);
    
    yPosition += 10;
    
    const barWidth = pageWidth - 2 * margin - 20;
    const barHeight = 8;
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(margin + 10, yPosition, barWidth, barHeight, 2, 2, 'S');
    
    pdf.setFillColor(scoreColorRGB[0], scoreColorRGB[1], scoreColorRGB[2]);
    pdf.roundedRect(margin + 10, yPosition, (barWidth * riskScore) / 100, barHeight, 2, 2, 'F');
    
    yPosition += 25;

    // Vulnerability Breakdown
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor('#0a0a0a');
    pdf.text('VULNERABILITY BREAKDOWN', margin, yPosition);
    yPosition += 12;
    
    const boxWidth = (pageWidth - 2 * margin - 15) / 4;
    const boxHeight = 40;
    const severities: VulnerabilitySeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    const severityColorsRGB = [
      [239, 68, 68],
      [249, 115, 22],
      [234, 179, 8],
      [59, 130, 246]
    ];
    
    severities.forEach((severity, index) => {
      const x = margin + index * (boxWidth + 5);
      const color = severityColorsRGB[index];
      
      pdf.setFillColor(color[0], color[1], color[2]);
      pdf.setGState(new pdf.GState({ opacity: 0.15 }));
      pdf.roundedRect(x, yPosition, boxWidth, boxHeight, 3, 3, 'F');
      pdf.setGState(new pdf.GState({ opacity: 1 }));
      
      pdf.setDrawColor(color[0], color[1], color[2]);
      pdf.setLineWidth(1.5);
      pdf.roundedRect(x, yPosition, boxWidth, boxHeight, 3, 3, 'S');
      
      pdf.setTextColor(color[0], color[1], color[2]);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text(summary[severity].toString(), x + boxWidth / 2, yPosition + 18, { align: 'center' });
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(severity, x + boxWidth / 2, yPosition + 30, { align: 'center' });
    });
    
    yPosition += boxHeight + 20;

    // ============================================
    // CERTIFICATION SECTION
    // ============================================
    addNewPageIfNeeded(60);
    
    pdf.setFillColor(245, 245, 245);
    pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 55, 3, 3, 'F');
    
    pdf.setDrawColor('#fbbf24');
    pdf.setLineWidth(2);
    pdf.roundedRect(margin + 2, yPosition + 2, pageWidth - 2 * margin - 4, 51, 3, 3, 'S');
    
    yPosition += 15;
    
    // Gold star circle background
    pdf.setFillColor(251, 191, 36);
    pdf.setGState(new pdf.GState({ opacity: 0.2 }));
    pdf.circle(margin + 20, yPosition + 5, 10, 'F');
    pdf.setGState(new pdf.GState({ opacity: 1 }));
    
    // Gold star
    pdf.setTextColor(251, 191, 36);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('★', margin + 20, yPosition + 9, { align: 'center' });
    
    pdf.setTextColor('#0a0a0a');
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('AUDIT CERTIFICATION', margin + 35, yPosition + 5);
    
    yPosition += 12;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor('#374151');
    pdf.text('This smart contract has been thoroughly analyzed and audited by', margin + 35, yPosition);
    yPosition += 6;
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor('#00d56a');
    pdf.text('Energi × ChainGPT AI-Powered Security Platform', margin + 35, yPosition);
    
    yPosition += 8;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor('#5f6368');
    pdf.text('✓ AI-Assisted Analysis  |  ✓ Manual Review  |  ✓ Best Practice Verification', margin + 35, yPosition);
    
    yPosition += 25;

    // ============================================
    // DETAILED FINDINGS
    // ============================================
    if (report.vulnerabilities.length > 0) {
      addNewPageIfNeeded(30);
      
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor('#00d56a');
      pdf.text('DETAILED FINDINGS', margin, yPosition);
      yPosition += 4;
      
      pdf.setDrawColor('#00d56a');
      pdf.setLineWidth(1);
      pdf.line(margin, yPosition, margin + 55, yPosition);
      yPosition += 15;
      
      report.vulnerabilities.forEach((vuln, index) => {
        addNewPageIfNeeded(55);
        
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 10, 2, 2, 'FD');
        
        const severityColorMap = {
          CRITICAL: [239, 68, 68],
          HIGH: [249, 115, 22],
          MEDIUM: [234, 179, 8],
          LOW: [59, 130, 246]
        };
        
        const severityColor = severityColorMap[vuln.severity];
        
        pdf.setFillColor(severityColor[0], severityColor[1], severityColor[2]);
        pdf.circle(margin + 7, yPosition + 5, 5, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text((index + 1).toString(), margin + 7, yPosition + 6.5, { align: 'center' });
        
        pdf.setFontSize(11);
        pdf.setTextColor('#0a0a0a');
        const maxTitleWidth = pageWidth - margin - 70;
        const titleLines = pdf.splitTextToSize(vuln.title, maxTitleWidth);
        pdf.text(titleLines[0], margin + 15, yPosition + 7);
        
        // Right-aligned severity badge
        drawSeverityBadge(vuln.severity, pageWidth - margin - 5, yPosition + 7);
        
        yPosition += 15;
        
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        
        if (vuln.category) {
          pdf.setTextColor('#374151');
          pdf.text('Category:', margin + 5, yPosition);
          pdf.setTextColor('#0a0a0a');
          pdf.text(vuln.category, margin + 25, yPosition);
          yPosition += 6;
        }
        
        if (vuln.function) {
          pdf.setTextColor('#374151');
          pdf.text('Function:', margin + 5, yPosition);
          pdf.setTextColor('#0a0a0a');
          pdf.text(vuln.function, margin + 25, yPosition);
          yPosition += 6;
        }
        
        if (vuln.lines && vuln.lines.length > 0) {
          pdf.setTextColor('#374151');
          pdf.text('Lines:', margin + 5, yPosition);
          pdf.setTextColor('#0a0a0a');
          pdf.text(vuln.lines.join(', '), margin + 20, yPosition);
          yPosition += 6;
        }
        
        yPosition += 3;
        
        pdf.setFillColor(249, 250, 251);
        pdf.roundedRect(margin + 5, yPosition, pageWidth - 2 * margin - 10, 0.1, 1, 1, 'F');
        yPosition += 5;
        
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor('#374151');
        pdf.text('DESCRIPTION', margin + 8, yPosition);
        yPosition += 6;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor('#0a0a0a');
        const descLines = pdf.splitTextToSize(vuln.description, pageWidth - 2 * margin - 20);
        descLines.forEach((line: string) => {
          addNewPageIfNeeded(lineHeight);
          pdf.text(line, margin + 8, yPosition);
          yPosition += lineHeight - 1;
        });
        
        yPosition += 5;
        
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor('#00d56a');
        pdf.text('✓ RECOMMENDATION', margin + 8, yPosition);
        yPosition += 6;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor('#0a0a0a');
        const recLines = pdf.splitTextToSize(vuln.recommendation, pageWidth - 2 * margin - 20);
        recLines.forEach((line: string) => {
          addNewPageIfNeeded(lineHeight);
          pdf.text(line, margin + 8, yPosition);
          yPosition += lineHeight - 1;
        });
        
        yPosition += 15;
      });
    }

    // ============================================
    // FINAL PAGE: SIGNATURES
    // ============================================
    addNewPageIfNeeded(80);
    
    yPosition = pageHeight - 90;
    
    pdf.setDrawColor('#00d56a');
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor('#0a0a0a');
    pdf.text('AUDIT VERIFIED BY', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;
    
    const sigBoxWidth = (pageWidth - 2 * margin - 20) / 2;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor('#00d56a');
    pdf.text('ENERGI', margin + sigBoxWidth / 2, yPosition, { align: 'center' });
    pdf.text('ChainGPT', pageWidth - margin - sigBoxWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 6;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor('#374151');
    pdf.text('Blockchain Security', margin + sigBoxWidth / 2, yPosition, { align: 'center' });
    pdf.text('AI Security Analysis', pageWidth - margin - sigBoxWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 15;
    
    pdf.setFontSize(7);
    pdf.setTextColor('#5f6368');
    const footerText = 'This audit report is generated by Energi × ChainGPT AI-powered security platform. For questions or verification, visit our platform.';
    const footerLines = pdf.splitTextToSize(footerText, pageWidth - 2 * margin);
    footerLines.forEach((line: string) => {
      pdf.text(line, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 4;
    });
    
    addFooter();

    // Save the PDF
    const filename = `${report.contractName.replace(/[^a-z0-9]/gi, '_')}_AUDIT_REPORT_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
