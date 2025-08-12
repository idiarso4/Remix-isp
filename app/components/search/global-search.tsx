import { useState, useEffect, useRef } from "react";
import { useFetcher, Link } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { 
  Search, 
  Users, 
  Ticket, 
  UserCheck, 
  Package,
  Loader2,
  ArrowRight,
  X
} from "lucide-react";
import { cn } from "~/lib/utils";

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  description: string;
  url: string;
  metadata: Record<string, any>;
}

interface GlobalSearchProps {
  className?: string;
  placeholder?: string;
}

export function GlobalSearch({ 
  className, 
  placeholder = "Search customers, tickets, employees..." 
}: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [breakdown, setBreakdown] = useState<Record<string, number>>({});
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const searchFetcher = useFetcher();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        searchFetcher.load(`/api/search?q=${encodeURIComponent(query)}&limit=8`);
      }, 300);
    } else {
      setResults([]);
      setBreakdown({});
      setIsOpen(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // Update results when data is loaded
  useEffect(() => {
    if (searchFetcher.data && typeof searchFetcher.data === 'object' && 'results' in searchFetcher.data) {
      setResults(searchFetcher.data.results as SearchResult[]);
      if ('breakdown' in searchFetcher.data) {
        setBreakdown(searchFetcher.data.breakdown as Record<string, number>);
      }
      setIsOpen(query.trim().length >= 2 && (searchFetcher.data.results as SearchResult[]).length > 0);
      setSelectedIndex(-1);
    }
  }, [searchFetcher.data, query]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < results.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < results.length) {
            const result = results[selectedIndex];
            window.location.href = result.url;
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSelectedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setBreakdown({});
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'customer': return <Users className="h-4 w-4 text-blue-500" />;
      case 'ticket': return <Ticket className="h-4 w-4 text-orange-500" />;
      case 'employee': return <UserCheck className="h-4 w-4 text-green-500" />;
      case 'package': return <Package className="h-4 w-4 text-purple-500" />;
      default: return <Search className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'customer': return 'Customer';
      case 'ticket': return 'Ticket';
      case 'employee': return 'Employee';
      case 'package': return 'Package';
      default: return type;
    }
  };

  const getStatusColor = (type: string, status: string) => {
    if (type === 'customer') {
      switch (status) {
        case 'ACTIVE': return 'bg-green-100 text-green-700';
        case 'INACTIVE': return 'bg-gray-100 text-gray-700';
        case 'SUSPENDED': return 'bg-red-100 text-red-700';
        default: return 'bg-gray-100 text-gray-700';
      }
    }
    if (type === 'ticket') {
      switch (status) {
        case 'OPEN': return 'bg-blue-100 text-blue-700';
        case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-700';
        case 'RESOLVED': return 'bg-green-100 text-green-700';
        case 'CLOSED': return 'bg-gray-100 text-gray-700';
        default: return 'bg-gray-100 text-gray-700';
      }
    }
    return 'bg-gray-100 text-gray-700';
  };

  const isLoading = searchFetcher.state === "loading";

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger className="w-full">
        <div className={cn("relative w-full max-w-md", className)}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10"
              onFocus={() => {
                if (query.trim().length >= 2 && results.length > 0) {
                  setIsOpen(true);
                }
              }}
            />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </PopoverTrigger>
      
      <PopoverContent className="w-96 p-0" align="start">
        <div className="max-h-96 overflow-y-auto">
          {/* Search Header */}
          <div className="border-b border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  Search Results
                </span>
                {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
              </div>
              {Object.keys(breakdown).length > 0 && (
                <div className="flex items-center space-x-1">
                  {Object.entries(breakdown).map(([type, count]) => (
                    count > 0 && (
                      <Badge key={type} variant="outline" className="text-xs">
                        {count} {type}
                      </Badge>
                    )
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Search Results */}
          {results.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {results.map((result, index) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  to={result.url}
                  className={cn(
                    "block p-3 hover:bg-gray-50 transition-colors",
                    selectedIndex === index && "bg-blue-50"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="mt-1">
                      {getTypeIcon(result.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {result.title}
                        </p>
                        <ArrowRight className="h-3 w-3 text-gray-400 ml-2" />
                      </div>
                      
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {result.subtitle}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-600 truncate">
                          {result.description}
                        </p>
                        <div className="flex items-center space-x-1 ml-2">
                          <Badge variant="outline" className="text-xs">
                            {getTypeLabel(result.type)}
                          </Badge>
                          {result.metadata.status && (
                            <Badge className={cn("text-xs", getStatusColor(result.type, result.metadata.status))}>
                              {result.metadata.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : query.trim().length >= 2 && !isLoading ? (
            <div className="p-6 text-center">
              <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No results found for "{query}"</p>
              <p className="text-xs text-gray-400 mt-1">
                Try searching for customers, tickets, employees, or packages
              </p>
            </div>
          ) : query.trim().length < 2 ? (
            <div className="p-6 text-center">
              <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Start typing to search</p>
              <p className="text-xs text-gray-400 mt-1">
                Search across customers, tickets, employees, and packages
              </p>
            </div>
          ) : null}

          {/* View All Results */}
          {results.length > 0 && (
            <div className="border-t border-gray-200 p-2">
              <Link
                to={`/search?q=${encodeURIComponent(query)}`}
                className="block w-full text-center py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                onClick={() => setIsOpen(false)}
              >
                View all results for "{query}"
              </Link>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}