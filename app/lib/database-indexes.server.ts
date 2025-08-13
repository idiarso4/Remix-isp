// Database indexing recommendations and optimization queries
// This file contains SQL commands that should be run on the database for optimal performance

export const RECOMMENDED_INDEXES = {
  // Customer table indexes
  customers: [
    'CREATE INDEX IF NOT EXISTS idx_customers_status ON "Customer"(status);',
    'CREATE INDEX IF NOT EXISTS idx_customers_email ON "Customer"(email);',
    'CREATE INDEX IF NOT EXISTS idx_customers_phone ON "Customer"(phone);',
    'CREATE INDEX IF NOT EXISTS idx_customers_package_id ON "Customer"("packageId");',
    'CREATE INDEX IF NOT EXISTS idx_customers_created_at ON "Customer"("createdAt");',
    'CREATE INDEX IF NOT EXISTS idx_customers_name_search ON "Customer" USING gin(to_tsvector(\'english\', name));'
  ],

  // Ticket table indexes
  tickets: [
    'CREATE INDEX IF NOT EXISTS idx_tickets_status ON "Ticket"(status);',
    'CREATE INDEX IF NOT EXISTS idx_tickets_priority ON "Ticket"(priority);',
    'CREATE INDEX IF NOT EXISTS idx_tickets_customer_id ON "Ticket"("customerId");',
    'CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON "Ticket"("assignedToId");',
    'CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON "Ticket"("createdAt");',
    'CREATE INDEX IF NOT EXISTS idx_tickets_status_priority ON "Ticket"(status, priority);',
    'CREATE INDEX IF NOT EXISTS idx_tickets_title_search ON "Ticket" USING gin(to_tsvector(\'english\', title));'
  ],

  // Employee table indexes
  employees: [
    'CREATE INDEX IF NOT EXISTS idx_employees_active ON "Employee"("isActive");',
    'CREATE INDEX IF NOT EXISTS idx_employees_handling_status ON "Employee"("handlingStatus");',
    'CREATE INDEX IF NOT EXISTS idx_employees_can_handle ON "Employee"("canHandleTickets");',
    'CREATE INDEX IF NOT EXISTS idx_employees_position ON "Employee"(position);',
    'CREATE INDEX IF NOT EXISTS idx_employees_division ON "Employee"(division);'
  ],

  // Payment table indexes
  payments: [
    'CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON "Payment"("customerId");',
    'CREATE INDEX IF NOT EXISTS idx_payments_status ON "Payment"(status);',
    'CREATE INDEX IF NOT EXISTS idx_payments_date ON "Payment"("paymentDate");',
    'CREATE INDEX IF NOT EXISTS idx_payments_amount ON "Payment"(amount);',
    'CREATE INDEX IF NOT EXISTS idx_payments_status_date ON "Payment"(status, "paymentDate");'
  ],

  // Package table indexes
  packages: [
    'CREATE INDEX IF NOT EXISTS idx_packages_active ON "Package"("isActive");',
    'CREATE INDEX IF NOT EXISTS idx_packages_price ON "Package"(price);',
    'CREATE INDEX IF NOT EXISTS idx_packages_duration ON "Package"(duration);'
  ],

  // Feedback table indexes
  feedback: [
    'CREATE INDEX IF NOT EXISTS idx_feedback_ticket_id ON "TicketFeedback"("ticketId");',
    'CREATE INDEX IF NOT EXISTS idx_feedback_customer_id ON "TicketFeedback"("customerId");',
    'CREATE INDEX IF NOT EXISTS idx_feedback_rating ON "TicketFeedback"(rating);',
    'CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON "TicketFeedback"("createdAt");'
  ],

  // Performance metrics indexes
  performance: [
    'CREATE INDEX IF NOT EXISTS idx_performance_employee_id ON "PerformanceMetrics"("employeeId");',
    'CREATE INDEX IF NOT EXISTS idx_performance_rating ON "PerformanceMetrics"("customerRating");'
  ]
};

// Composite indexes for common query patterns
export const COMPOSITE_INDEXES = [
  // Customer search and filtering
  'CREATE INDEX IF NOT EXISTS idx_customers_status_package ON "Customer"(status, "packageId");',
  'CREATE INDEX IF NOT EXISTS idx_customers_status_created ON "Customer"(status, "createdAt" DESC);',
  
  // Ticket management
  'CREATE INDEX IF NOT EXISTS idx_tickets_assigned_status ON "Ticket"("assignedToId", status);',
  'CREATE INDEX IF NOT EXISTS idx_tickets_customer_status ON "Ticket"("customerId", status);',
  'CREATE INDEX IF NOT EXISTS idx_tickets_priority_created ON "Ticket"(priority DESC, "createdAt" DESC);',
  
  // Payment tracking
  'CREATE INDEX IF NOT EXISTS idx_payments_customer_date ON "Payment"("customerId", "paymentDate" DESC);',
  'CREATE INDEX IF NOT EXISTS idx_payments_status_amount ON "Payment"(status, amount DESC);',
  
  // Performance analytics
  'CREATE INDEX IF NOT EXISTS idx_tickets_assigned_completed ON "Ticket"("assignedToId", "completedAt") WHERE "completedAt" IS NOT NULL;'
];

// Query optimization hints
export const QUERY_OPTIMIZATIONS = {
  // Use LIMIT and OFFSET for pagination
  pagination: `
    -- Always use LIMIT and OFFSET for large result sets
    SELECT * FROM "Customer" 
    ORDER BY "createdAt" DESC 
    LIMIT 20 OFFSET 0;
  `,

  // Use EXISTS instead of IN for better performance
  existsVsIn: `
    -- Better performance with EXISTS
    SELECT c.* FROM "Customer" c 
    WHERE EXISTS (
      SELECT 1 FROM "Ticket" t 
      WHERE t."customerId" = c.id AND t.status = 'OPEN'
    );
    
    -- Instead of IN (slower for large datasets)
    SELECT c.* FROM "Customer" c 
    WHERE c.id IN (
      SELECT t."customerId" FROM "Ticket" t 
      WHERE t.status = 'OPEN'
    );
  `,

  // Use partial indexes for filtered queries
  partialIndexes: [
    'CREATE INDEX IF NOT EXISTS idx_active_customers ON "Customer"(name) WHERE status = \'ACTIVE\';',
    'CREATE INDEX IF NOT EXISTS idx_open_tickets ON "Ticket"("createdAt" DESC) WHERE status IN (\'OPEN\', \'IN_PROGRESS\');',
    'CREATE INDEX IF NOT EXISTS idx_overdue_payments ON "Payment"("paymentDate" DESC) WHERE status = \'OVERDUE\';'
  ]
};

// Database maintenance queries
export const MAINTENANCE_QUERIES = {
  // Analyze tables for query planner
  analyze: [
    'ANALYZE "Customer";',
    'ANALYZE "Ticket";',
    'ANALYZE "Employee";',
    'ANALYZE "Payment";',
    'ANALYZE "Package";'
  ],

  // Vacuum tables to reclaim space
  vacuum: [
    'VACUUM ANALYZE "Customer";',
    'VACUUM ANALYZE "Ticket";',
    'VACUUM ANALYZE "Employee";',
    'VACUUM ANALYZE "Payment";'
  ],

  // Check index usage
  indexUsage: `
    SELECT 
      schemaname,
      tablename,
      indexname,
      idx_tup_read,
      idx_tup_fetch,
      idx_scan
    FROM pg_stat_user_indexes 
    ORDER BY idx_scan DESC;
  `,

  // Find unused indexes
  unusedIndexes: `
    SELECT 
      schemaname,
      tablename,
      indexname,
      idx_scan,
      pg_size_pretty(pg_relation_size(indexrelid)) as size
    FROM pg_stat_user_indexes 
    WHERE idx_scan = 0
    ORDER BY pg_relation_size(indexrelid) DESC;
  `
};

// Performance monitoring queries
export const PERFORMANCE_QUERIES = {
  // Slow queries
  slowQueries: `
    SELECT 
      query,
      calls,
      total_time,
      mean_time,
      rows
    FROM pg_stat_statements 
    WHERE mean_time > 100
    ORDER BY mean_time DESC 
    LIMIT 10;
  `,

  // Table sizes
  tableSizes: `
    SELECT 
      schemaname,
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
      pg_total_relation_size(schemaname||'.'||tablename) as bytes
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY bytes DESC;
  `,

  // Index effectiveness
  indexEffectiveness: `
    SELECT 
      t.tablename,
      indexname,
      c.reltuples AS num_rows,
      pg_size_pretty(pg_relation_size(quote_ident(t.schemaname)||'.'||quote_ident(t.tablename))) AS table_size,
      pg_size_pretty(pg_relation_size(quote_ident(t.schemaname)||'.'||quote_ident(t.indexname))) AS index_size,
      CASE WHEN indisunique THEN 'Y' ELSE 'N' END AS unique,
      idx_scan as number_of_scans,
      idx_tup_read as tuples_read,
      idx_tup_fetch as tuples_fetched
    FROM pg_tables t
    LEFT OUTER JOIN pg_class c ON c.relname=t.tablename
    LEFT OUTER JOIN pg_index i ON c.oid = i.indrelid
    LEFT OUTER JOIN pg_class ci ON ci.oid = i.indexrelid
    LEFT OUTER JOIN pg_stat_user_indexes pgsui ON pgsui.indexrelid = i.indexrelid
    WHERE t.schemaname = 'public'
    ORDER BY pg_relation_size(quote_ident(t.schemaname)||'.'||quote_ident(t.indexname)) DESC;
  `
};

// Function to apply all recommended indexes
export function generateIndexCreationScript(): string {
  const allIndexes = [
    ...RECOMMENDED_INDEXES.customers,
    ...RECOMMENDED_INDEXES.tickets,
    ...RECOMMENDED_INDEXES.employees,
    ...RECOMMENDED_INDEXES.payments,
    ...RECOMMENDED_INDEXES.packages,
    ...RECOMMENDED_INDEXES.feedback,
    ...RECOMMENDED_INDEXES.performance,
    ...COMPOSITE_INDEXES,
    ...QUERY_OPTIMIZATIONS.partialIndexes
  ];

  return allIndexes.join('\n');
}

// Function to generate maintenance script
export function generateMaintenanceScript(): string {
  return [
    '-- Database Maintenance Script',
    '-- Run this periodically to maintain optimal performance',
    '',
    '-- Analyze tables',
    ...MAINTENANCE_QUERIES.analyze,
    '',
    '-- Vacuum tables (run during low traffic)',
    ...MAINTENANCE_QUERIES.vacuum,
    ''
  ].join('\n');
}