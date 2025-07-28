import { Button } from "~/components/ui/button";
import { Printer } from "lucide-react";

interface PrintButtonProps {
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
}

export function PrintButton({ 
  variant = "outline", 
  size = "default", 
  className = "",
  children 
}: PrintButtonProps) {
  const handlePrint = () => {
    // Add print-specific styles before printing
    const printStyles = `
      <style>
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:mb-4 {
            margin-bottom: 1rem !important;
          }
          .print\\:p-4 {
            padding: 1rem !important;
          }
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            font-size: 12px;
          }
          .bg-white {
            background-color: white !important;
          }
          .border {
            border: 1px solid #e5e7eb !important;
          }
          .shadow-sm, .shadow, .shadow-md, .shadow-lg {
            box-shadow: none !important;
          }
          .rounded-lg, .rounded-md, .rounded {
            border-radius: 4px !important;
          }
          /* Header for print */
          @page {
            margin: 1in;
            @top-center {
              content: "ISP Management System - " attr(data-page-title);
            }
            @bottom-center {
              content: "Halaman " counter(page) " dari " counter(pages);
            }
          }
          /* Print header */
          .print-header {
            display: block !important;
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          .print-header h1 {
            font-size: 18px;
            font-weight: bold;
            margin: 0;
          }
          .print-header p {
            font-size: 12px;
            margin: 5px 0 0 0;
            color: #666;
          }
          /* Print footer */
          .print-footer {
            display: block !important;
            text-align: center;
            margin-top: 20px;
            border-top: 1px solid #ccc;
            padding-top: 10px;
            font-size: 10px;
            color: #666;
          }
        }
      </style>
    `;

    // Add print header and footer if they don't exist
    if (!document.querySelector('.print-header')) {
      const printHeader = document.createElement('div');
      printHeader.className = 'print-header hidden';
      printHeader.innerHTML = `
        <h1>ISP Management System</h1>
        <p>Laporan dicetak pada: ${new Date().toLocaleDateString('id-ID', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
      `;
      document.body.insertBefore(printHeader, document.body.firstChild);
    }

    if (!document.querySelector('.print-footer')) {
      const printFooter = document.createElement('div');
      printFooter.className = 'print-footer hidden';
      printFooter.innerHTML = `
        <p>© ${new Date().getFullYear()} ISP Management System. Dokumen ini dicetak secara otomatis.</p>
      `;
      document.body.appendChild(printFooter);
    }

    // Add styles to head if not exists
    if (!document.querySelector('#print-styles')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'print-styles';
      styleElement.innerHTML = printStyles;
      document.head.appendChild(styleElement);
    }

    // Trigger print
    window.print();
  };

  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={handlePrint}
      className={`print:hidden ${className}`}
    >
      <Printer className="mr-2 h-4 w-4" />
      {children || "Cetak"}
    </Button>
  );
}

// Print-specific utility classes component
export function PrintStyles() {
  return (
    <style jsx global>{`
      @media print {
        .print\\:hidden {
          display: none !important;
        }
        .print\\:block {
          display: block !important;
        }
        .print\\:mb-4 {
          margin-bottom: 1rem !important;
        }
        .print\\:p-4 {
          padding: 1rem !important;
        }
        .print\\:text-sm {
          font-size: 0.875rem !important;
        }
        .print\\:break-before {
          page-break-before: always !important;
        }
        .print\\:break-after {
          page-break-after: always !important;
        }
        .print\\:break-inside-avoid {
          page-break-inside: avoid !important;
        }
        
        body {
          -webkit-print-color-adjust: exact;
          color-adjust: exact;
          font-size: 12px;
          line-height: 1.4;
        }
        
        .bg-white {
          background-color: white !important;
        }
        
        .border {
          border: 1px solid #e5e7eb !important;
        }
        
        .shadow-sm, .shadow, .shadow-md, .shadow-lg {
          box-shadow: none !important;
        }
        
        .rounded-lg, .rounded-md, .rounded {
          border-radius: 4px !important;
        }
        
        /* Print header and footer */
        .print-header {
          display: block !important;
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
        }
        
        .print-header h1 {
          font-size: 18px;
          font-weight: bold;
          margin: 0;
        }
        
        .print-header p {
          font-size: 12px;
          margin: 5px 0 0 0;
          color: #666;
        }
        
        .print-footer {
          display: block !important;
          text-align: center;
          margin-top: 20px;
          border-top: 1px solid #ccc;
          padding-top: 10px;
          font-size: 10px;
          color: #666;
        }
        
        /* Page settings */
        @page {
          margin: 1in;
          size: A4;
        }
        
        /* Table printing */
        table {
          border-collapse: collapse !important;
          width: 100% !important;
        }
        
        th, td {
          border: 1px solid #ddd !important;
          padding: 8px !important;
          text-align: left !important;
        }
        
        th {
          background-color: #f5f5f5 !important;
          font-weight: bold !important;
        }
        
        /* Avoid breaking elements */
        .print\\:break-inside-avoid,
        .card,
        .border {
          page-break-inside: avoid !important;
        }
      }
    `}</style>
  );
}