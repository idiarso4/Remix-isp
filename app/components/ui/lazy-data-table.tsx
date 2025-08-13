import { useState, useEffect, useCallback, useMemo } from "react";
import { useFetcher } from "@remix-run/react";
import { DataTable, type Column } from "~/components/tables/data-table";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { ChevronDown, Loader2 } from "lucide-react";

interface LazyDataTableProps<T> {
  endpoint: string;
  columns: Column<T>[];
  pageSize?: number;
  searchable?: boolean;
  sortable?: boolean;
  filters?: Record<string, any>;
  emptyMessage?: string;
  className?: string;
}

export function LazyDataTable<T extends { id: string }>({
  endpoint,
  columns,
  pageSize = 20,
  searchable = true,
  sortable = true,
  filters = {},
  emptyMessage = "No data found",
  className
}: LazyDataTableProps<T>) {
  const [data, setData] = useState<T[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const fetcher = useFetcher<{
    data: T[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      hasMore: boolean;
    };
  }>();

  // Build query parameters
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', currentPage.toString());
    params.set('limit', pageSize.toString());
    
    if (searchQuery) {
      params.set('search', searchQuery);
    }
    
    if (sortConfig) {
      params.set('sortBy', sortConfig.key);
      params.set('sortOrder', sortConfig.direction);
    }
    
    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, value.toString());
      }
    });
    
    return params.toString();
  }, [currentPage, pageSize, searchQuery, sortConfig, filters]);

  // Load data
  const loadData = useCallback((reset = false) => {
    if (loading) return;
    
    setLoading(true);
    const url = `${endpoint}?${queryParams}`;
    fetcher.load(url);
  }, [endpoint, queryParams, loading, fetcher]);

  // Handle fetcher data
  useEffect(() => {
    if (fetcher.data) {
      const { data: newData, pagination } = fetcher.data;
      
      if (currentPage === 1) {
        // Reset data for first page or new search
        setData(newData);
      } else {
        // Append data for pagination
        setData(prev => [...prev, ...newData]);
      }
      
      setTotalPages(pagination.totalPages);
      setTotalItems(pagination.totalItems);
      setHasMore(pagination.hasMore);
      setLoading(false);
    }
  }, [fetcher.data, currentPage]);

  // Handle fetcher state
  useEffect(() => {
    if (fetcher.state === 'loading') {
      setLoading(true);
    } else if (fetcher.state === 'idle') {
      setLoading(false);
    }
  }, [fetcher.state]);

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    setData([]);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      loadData(true);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [loadData]);

  // Handle sort
  const handleSort = useCallback((key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
    setCurrentPage(1);
    setData([]);
    loadData(true);
  }, [loadData]);

  // Load more data
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setCurrentPage(prev => prev + 1);
      loadData();
    }
  }, [loading, hasMore, loadData]);

  // Reset filters
  const resetFilters = useCallback(() => {
    setSearchQuery("");
    setSortConfig(null);
    setCurrentPage(1);
    setData([]);
    loadData(true);
  }, [loadData]);

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );

  return (
    <div className={className}>
      {/* Search and filters */}
      {searchable && (
        <div className="mb-4 flex items-center space-x-4">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button variant="outline" onClick={resetFilters}>
            Reset
          </Button>
        </div>
      )}

      {/* Data table */}
      {data.length > 0 ? (
        <DataTable
          data={data}
          columns={columns}
          searchable={false} // We handle search ourselves
          sortable={sortable}
          onSort={handleSort}
          emptyMessage={emptyMessage}
          pagination={{
            currentPage,
            totalPages,
            pageSize,
            totalItems,
            onPageChange: () => {} // We handle pagination ourselves
          }}
        />
      ) : loading && currentPage === 1 ? (
        <LoadingSkeleton />
      ) : (
        <div className="text-center py-8 text-gray-500">
          {emptyMessage}
        </div>
      )}

      {/* Load more button */}
      {hasMore && data.length > 0 && (
        <div className="mt-6 text-center">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loading}
            className="min-w-32"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" />
                Load More ({totalItems - data.length} remaining)
              </>
            )}
          </Button>
        </div>
      )}

      {/* Loading indicator for pagination */}
      {loading && currentPage > 1 && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 rounded-lg">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm text-blue-600">Loading more data...</span>
          </div>
        </div>
      )}

      {/* Data info */}
      <div className="mt-4 text-sm text-gray-500 text-center">
        Showing {data.length} of {totalItems} items
        {searchQuery && ` for "${searchQuery}"`}
      </div>
    </div>
  );
}

// Hook for lazy loading data
export function useLazyData<T>(
  endpoint: string,
  options: {
    pageSize?: number;
    filters?: Record<string, any>;
    autoLoad?: boolean;
  } = {}
) {
  const { pageSize = 20, filters = {}, autoLoad = true } = options;
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const fetcher = useFetcher<{
    data: T[];
    pagination: {
      hasMore: boolean;
      totalItems: number;
    };
  }>();

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;

    const params = new URLSearchParams();
    params.set('page', (currentPage + 1).toString());
    params.set('limit', pageSize.toString());

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, value.toString());
      }
    });

    fetcher.load(`${endpoint}?${params.toString()}`);
  }, [endpoint, currentPage, pageSize, filters, loading, hasMore, fetcher]);

  const reset = useCallback(() => {
    setData([]);
    setCurrentPage(1);
    setHasMore(true);
    setError(null);
  }, []);

  useEffect(() => {
    if (fetcher.data) {
      const { data: newData, pagination } = fetcher.data;
      setData(prev => currentPage === 1 ? newData : [...prev, ...newData]);
      setHasMore(pagination.hasMore);
      setCurrentPage(prev => prev + 1);
      setLoading(false);
    }
  }, [fetcher.data, currentPage]);

  useEffect(() => {
    setLoading(fetcher.state === 'loading');
  }, [fetcher.state]);

  useEffect(() => {
    if (autoLoad && data.length === 0) {
      loadMore();
    }
  }, [autoLoad, data.length, loadMore]);

  return {
    data,
    loading,
    error,
    hasMore,
    loadMore,
    reset
  };
}