// Utility functions for data export

export interface ExportColumn {
  key: string;
  header: string;
  formatter?: (value: any) => string;
}

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  filename: string
) {
  // Create CSV header
  const headers = columns.map(col => col.header).join(',');
  
  // Create CSV rows
  const rows = data.map(item => {
    return columns.map(col => {
      let value = item[col.key];
      
      // Apply formatter if provided
      if (col.formatter && value !== null && value !== undefined) {
        value = col.formatter(value);
      }
      
      // Handle null/undefined values
      if (value === null || value === undefined) {
        value = '';
      }
      
      // Convert to string and escape quotes
      value = String(value);
      
      // Wrap in quotes if contains comma, quote, or newline
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = '"' + value.replace(/"/g, '""') + '"';
      }
      
      return value;
    }).join(',');
  });
  
  // Combine header and rows
  const csvContent = [headers, ...rows].join('\n');
  
  // Create and download file
  downloadFile(csvContent, filename, 'text/csv');
}

export function exportToJSON<T>(data: T[], filename: string) {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, filename, 'application/json');
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// Predefined formatters
export const formatters = {
  date: (date: string | Date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('id-ID');
  },
  
  datetime: (date: string | Date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('id-ID') + ' ' + d.toLocaleTimeString('id-ID');
  },
  
  currency: (amount: number) => {
    if (typeof amount !== 'number') return '';
    return 'Rp ' + amount.toLocaleString('id-ID');
  },
  
  boolean: (value: boolean) => {
    return value ? 'Ya' : 'Tidak';
  },
  
  status: (status: string) => {
    const statusMap: Record<string, string> = {
      'ACTIVE': 'Aktif',
      'INACTIVE': 'Tidak Aktif',
      'SUSPENDED': 'Suspended',
      'OPEN': 'Terbuka',
      'IN_PROGRESS': 'Dalam Proses',
      'PENDING': 'Pending',
      'RESOLVED': 'Selesai',
      'CLOSED': 'Ditutup',
      'PAID': 'Lunas',
      'OVERDUE': 'Terlambat',
      'ADMIN': 'Admin',
      'TECHNICIAN': 'Teknisi',
      'MARKETING': 'Marketing',
      'HR': 'HR'
    };
    return statusMap[status] || status;
  }
};

// Export configurations for different data types
export const exportConfigs = {
  customers: {
    filename: 'data-pelanggan',
    columns: [
      { key: 'name', header: 'Nama' },
      { key: 'email', header: 'Email' },
      { key: 'phone', header: 'Telepon' },
      { key: 'address', header: 'Alamat' },
      { key: 'location', header: 'Lokasi' },
      { key: 'status', header: 'Status', formatter: formatters.status },
      { key: 'package.name', header: 'Paket' },
      { key: 'createdAt', header: 'Tanggal Bergabung', formatter: formatters.date }
    ] as ExportColumn[]
  },
  
  packages: {
    filename: 'data-paket',
    columns: [
      { key: 'name', header: 'Nama Paket' },
      { key: 'speed', header: 'Kecepatan' },
      { key: 'price', header: 'Harga', formatter: formatters.currency },
      { key: 'duration', header: 'Durasi' },
      { key: 'description', header: 'Deskripsi' },
      { key: 'isActive', header: 'Status', formatter: formatters.boolean },
      { key: 'customerCount', header: 'Jumlah Pelanggan' },
      { key: 'createdAt', header: 'Tanggal Dibuat', formatter: formatters.date }
    ] as ExportColumn[]
  },
  
  tickets: {
    filename: 'data-tiket',
    columns: [
      { key: 'title', header: 'Judul' },
      { key: 'customer.name', header: 'Pelanggan' },
      { key: 'status', header: 'Status', formatter: formatters.status },
      { key: 'priority', header: 'Prioritas' },
      { key: 'category', header: 'Kategori' },
      { key: 'assignedTo.name', header: 'Teknisi' },
      { key: 'createdAt', header: 'Tanggal Dibuat', formatter: formatters.datetime },
      { key: 'completedAt', header: 'Tanggal Selesai', formatter: formatters.datetime }
    ] as ExportColumn[]
  },
  
  employees: {
    filename: 'data-karyawan',
    columns: [
      { key: 'name', header: 'Nama' },
      { key: 'user.email', header: 'Email' },
      { key: 'phone', header: 'Telepon' },
      { key: 'position', header: 'Posisi' },
      { key: 'division', header: 'Divisi' },
      { key: 'role', header: 'Role', formatter: formatters.status },
      { key: 'isActive', header: 'Status', formatter: formatters.boolean },
      { key: 'canHandleTickets', header: 'Dapat Menangani Tiket', formatter: formatters.boolean },
      { key: 'currentTicketCount', header: 'Tiket Aktif' },
      { key: 'hireDate', header: 'Tanggal Bergabung', formatter: formatters.date }
    ] as ExportColumn[]
  }
};