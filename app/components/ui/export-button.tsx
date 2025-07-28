import { useState } from "react";
import { Button } from "~/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "~/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { exportToCSV, exportToJSON, type ExportColumn } from "~/lib/export-utils";

interface ExportButtonProps<T> {
  data: T[];
  columns: ExportColumn[];
  filename: string;
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function ExportButton<T extends Record<string, any>>({ 
  data, 
  columns, 
  filename,
  variant = "outline", 
  size = "default", 
  className = "" 
}: ExportButtonProps<T>) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      const fullFilename = `${filename}-${timestamp}`;
      
      if (format === 'csv') {
        exportToCSV(data, columns, `${fullFilename}.csv`);
      } else if (format === 'json') {
        exportToJSON(data, `${fullFilename}.json`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      // You could add a toast notification here
    } finally {
      setIsExporting(false);
    }
  };

  if (data.length === 0) {
    return (
      <Button 
        variant={variant} 
        size={size} 
        disabled
        className={className}
      >
        <Download className="mr-2 h-4 w-4" />
        Ekspor (Tidak ada data)
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger 
        className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background ${
          variant === 'outline' ? 'border border-input bg-background hover:bg-accent hover:text-accent-foreground' : 
          variant === 'ghost' ? 'hover:bg-accent hover:text-accent-foreground' :
          'bg-primary text-primary-foreground hover:bg-primary/90'
        } ${
          size === 'sm' ? 'h-9 px-3' : 
          size === 'lg' ? 'h-11 px-8' : 
          'h-10 px-4 py-2'
        } ${className}`}
        disabled={isExporting}
      >
        <Download className="mr-2 h-4 w-4" />
        {isExporting ? 'Mengekspor...' : 'Ekspor'}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Ekspor ke CSV ({data.length} baris)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('json')}>
          <FileText className="mr-2 h-4 w-4" />
          Ekspor ke JSON ({data.length} baris)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Quick export button for common use cases
interface QuickExportButtonProps {
  type: 'customers' | 'packages' | 'tickets' | 'employees' | 'payments';
  data: any[];
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function QuickExportButton({ 
  type, 
  data, 
  variant = "outline", 
  size = "default", 
  className = "" 
}: QuickExportButtonProps) {
  // Import the configs here to avoid circular dependencies
  const exportConfigs = {
    customers: {
      filename: 'data-pelanggan',
      columns: [
        { key: 'name', header: 'Nama' },
        { key: 'email', header: 'Email' },
        { key: 'phone', header: 'Telepon' },
        { key: 'address', header: 'Alamat' },
        { key: 'location', header: 'Lokasi' },
        { key: 'status', header: 'Status' },
        { key: 'package.name', header: 'Paket' },
        { key: 'createdAt', header: 'Tanggal Bergabung' }
      ]
    },
    packages: {
      filename: 'data-paket',
      columns: [
        { key: 'name', header: 'Nama Paket' },
        { key: 'speed', header: 'Kecepatan' },
        { key: 'price', header: 'Harga' },
        { key: 'duration', header: 'Durasi' },
        { key: 'description', header: 'Deskripsi' },
        { key: 'isActive', header: 'Status' },
        { key: 'createdAt', header: 'Tanggal Dibuat' }
      ]
    },
    tickets: {
      filename: 'data-tiket',
      columns: [
        { key: 'title', header: 'Judul' },
        { key: 'customer.name', header: 'Pelanggan' },
        { key: 'status', header: 'Status' },
        { key: 'priority', header: 'Prioritas' },
        { key: 'category', header: 'Kategori' },
        { key: 'assignedTo.name', header: 'Teknisi' },
        { key: 'createdAt', header: 'Tanggal Dibuat' },
        { key: 'completedAt', header: 'Tanggal Selesai' }
      ]
    },
    employees: {
      filename: 'data-karyawan',
      columns: [
        { key: 'name', header: 'Nama' },
        { key: 'user.email', header: 'Email' },
        { key: 'phone', header: 'Telepon' },
        { key: 'position', header: 'Posisi' },
        { key: 'division', header: 'Divisi' },
        { key: 'role', header: 'Role' },
        { key: 'isActive', header: 'Status' },
        { key: 'hireDate', header: 'Tanggal Bergabung' }
      ]
    },
    payments: {
      filename: 'data-pembayaran',
      columns: [
        { key: 'customer.name', header: 'Pelanggan' },
        { key: 'customer.email', header: 'Email Pelanggan' },
        { key: 'amount', header: 'Jumlah' },
        { key: 'paymentDate', header: 'Tanggal Pembayaran' },
        { key: 'status', header: 'Status' },
        { key: 'customer.package.name', header: 'Paket' },
        { key: 'createdAt', header: 'Tanggal Dicatat' }
      ]
    }
  };

  const config = exportConfigs[type];
  
  return (
    <ExportButton
      data={data}
      columns={config.columns}
      filename={config.filename}
      variant={variant}
      size={size}
      className={className}
    />
  );
}