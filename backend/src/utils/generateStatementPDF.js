// backend/src/utils/generateStatementPDF.js
const PDFDocument = require('pdfkit');
const moment = require('moment');
const fs = require('fs');
const path = require('path');

function generateSalesStatementPDF(res, sales, startDate, endDate, rangeLabel = 'All') {
  const doc = new PDFDocument({ 
    margin: 40, 
    size: 'A4',
    bufferPages: true,
    info: {
      Title: `Sales Statement ${rangeLabel}`,
      Author: 'SpheneGem Inventory System',
      Creator: 'SpheneGem'
    }
  });

  const filename = `sales_statement_${rangeLabel}_${moment().format('YYYYMMDD_HHmm')}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  doc.pipe(res);

  // Colors
  const primaryColor = '#2e7d32'; // Green
  const secondaryColor = '#f5f5f5';
  const textColor = '#333333';
  const borderColor = '#dddddd';

  // Header
  const logoPath = path.join(__dirname, '../public/logo.png');
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 40, 30, { width: 60 });
  }

  doc.fillColor(primaryColor)
     .font('Helvetica-Bold')
     .fontSize(20)
     .text('SALES STATEMENT', 110, 40, { 
       width: 400, 
       align: 'center',
       underline: true
     });

  doc.fillColor(textColor)
     .font('Helvetica')
     .fontSize(10)
     .text('SpheneGem Inventory System', 40, 80)
     .text(`Generated: ${moment().format('YYYY-MM-DD HH:mm')}`, { align: 'right' });

  doc.moveDown();
  doc.font('Helvetica-Bold').text('Report Period:', { continued: true })
     .font('Helvetica').text(` ${startDate.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}`);

  doc.moveDown(2);

  // Summary Box
  const summaryTop = doc.y;
  doc.rect(40, summaryTop, 530, 60)
     .fill(secondaryColor)
     .stroke(borderColor);

  doc.fillColor(primaryColor)
     .font('Helvetica-Bold')
     .fontSize(12)
     .text('SUMMARY', 50, summaryTop + 10);

  const totalSales = sales.length;
  const totalCarat = sales.reduce((sum, sale) => sum + parseFloat(sale.carat_sold), 0);
  const grandTotal = sales.reduce((sum, sale) => sum + parseFloat(sale.total_amount), 0);

  doc.fillColor(textColor)
     .font('Helvetica')
     .fontSize(10)
     .text(`Total Transactions: ${totalSales}`, 50, summaryTop + 30)
     .text(`Total Carat Sold: ${totalCarat.toFixed(2)} ct`, 200, summaryTop + 30)
     .text(`Grand Total: $${grandTotal.toFixed(2)}`, 400, summaryTop + 30, { align: 'right' });

  doc.moveDown(3);

  // Table Header
  const tableTop = doc.y;
  const rowHeight = 20;
  const startX = 40;

  const columnWidths = {
    index: 30,
    date: 80,
    code: 60,
    name: 90,
    shape: 60,
    carat: 60,
    pricePerCt: 80,
    total: 80
  };

  // Draw table header
  doc.fillColor('#ffffff')
     .rect(startX, tableTop, 530, rowHeight)
     .fill()
     .stroke(borderColor);

  doc.fillColor(primaryColor)
     .font('Helvetica-Bold')
     .fontSize(10);

  doc.text('#', startX + 5, tableTop + 5, { width: columnWidths.index });
  doc.text('Date', startX + columnWidths.index, tableTop + 5, { width: columnWidths.date });
  doc.text('Code', startX + columnWidths.index + columnWidths.date, tableTop + 5, { width: columnWidths.code });
  doc.text('Name', startX + columnWidths.index + columnWidths.date + columnWidths.code, tableTop + 5, { width: columnWidths.name });
  doc.text('Shape', startX + columnWidths.index + columnWidths.date + columnWidths.code + columnWidths.name, tableTop + 5, { width: columnWidths.shape });
  doc.text('Carat', startX + columnWidths.index + columnWidths.date + columnWidths.code + columnWidths.name + columnWidths.shape, tableTop + 5, { width: columnWidths.carat, align: 'right' });
  doc.text('Price/CT', startX + columnWidths.index + columnWidths.date + columnWidths.code + columnWidths.name + columnWidths.shape + columnWidths.carat, tableTop + 5, { width: columnWidths.pricePerCt, align: 'right' });
  doc.text('Total', startX + columnWidths.index + columnWidths.date + columnWidths.code + columnWidths.name + columnWidths.shape + columnWidths.carat + columnWidths.pricePerCt, tableTop + 5, { width: columnWidths.total, align: 'right' });

  // Table Rows
  let y = tableTop + rowHeight;
  doc.font('Helvetica').fontSize(9).fillColor(textColor);

  sales.forEach((sale, i) => {
    const isAlt = i % 2 === 0;
    if (isAlt) {
      doc.fillColor(secondaryColor)
         .rect(startX, y, 530, rowHeight)
         .fill()
         .stroke(borderColor);
    }

    doc.fillColor(textColor)
       .text((i + 1).toString(), startX + 5, y + 5, { width: columnWidths.index })
       .text(moment(sale.sold_at).format('YYYY-MM-DD'), startX + columnWidths.index, y + 5, { width: columnWidths.date })
       .text(sale.code, startX + columnWidths.index + columnWidths.date, y + 5, { width: columnWidths.code })
       .text(sale.name, startX + columnWidths.index + columnWidths.date + columnWidths.code, y + 5, { width: columnWidths.name })
       .text(sale.shape, startX + columnWidths.index + columnWidths.date + columnWidths.code + columnWidths.name, y + 5, { width: columnWidths.shape })
       .text(sale.carat_sold.toFixed(2), startX + columnWidths.index + columnWidths.date + columnWidths.code + columnWidths.name + columnWidths.shape, y + 5, { width: columnWidths.carat, align: 'right' })
       .text(`$${parseFloat(sale.marking_price).toFixed(2)}`, startX + columnWidths.index + columnWidths.date + columnWidths.code + columnWidths.name + columnWidths.shape + columnWidths.carat, y + 5, { width: columnWidths.pricePerCt, align: 'right' })
       .text(`$${parseFloat(sale.total_amount).toFixed(2)}`, startX + columnWidths.index + columnWidths.date + columnWidths.code + columnWidths.name + columnWidths.shape + columnWidths.carat + columnWidths.pricePerCt, y + 5, { width: columnWidths.total, align: 'right' });

    y += rowHeight;

    // Page break if needed
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = 40;
      // Redraw header on new page
      doc.fillColor('#ffffff')
         .rect(startX, y, 530, rowHeight)
         .fill()
         .stroke(borderColor);
      
      doc.fillColor(primaryColor)
         .font('Helvetica-Bold')
         .fontSize(10);
      
      ['#', 'Date', 'Code', 'Name', 'Shape', 'Carat', 'Price/CT', 'Total'].forEach((text, idx) => {
        const xPos = idx === 0 ? startX + 5 : startX + Object.values(columnWidths).slice(0, idx).reduce((a, b) => a + b, 0);
        const align = idx >= 5 ? 'right' : 'left';
        doc.text(text, xPos, y + 5, { 
          width: Object.values(columnWidths)[idx],
          align: align
        });
      });
      
      y += rowHeight;
      doc.font('Helvetica').fontSize(9).fillColor(textColor);
    }
  });

  // Footer
  doc.moveTo(startX, y).lineTo(startX + 530, y).stroke();
  doc.font('Helvetica-Bold').fontSize(10).fillColor(primaryColor)
     .text(`Grand Total: $${grandTotal.toFixed(2)}`, startX, y + 10, { 
       width: 530, 
       align: 'right' 
     });

  // Page numbers
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    
    doc.fillColor(textColor)
       .font('Helvetica')
       .fontSize(8)
       .text(`Page ${i + 1} of ${range.count}`, 40, doc.page.height - 30, {
         align: 'center',
         width: doc.page.width - 80
       })
       .text('Confidential - SpheneGem Inventory System', 40, doc.page.height - 20, {
         align: 'center',
         width: doc.page.width - 80
       });
  }

  doc.end();
}

module.exports = generateSalesStatementPDF;
