import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams, Link } from "@remix-run/react";
import { useState, useEffect } from "react";
import { requireAuth } from "~/lib/auth.server";
import { PageContainer } from "~/components/layout/page-container";
import { PageHeader } from "~/components/layout/page-header";
import { GlobalSearch } from "~/components/search/global-search";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { DataGrid, DataCard } from "~/components/ui/data-grid";
import {
    Search,
    Users,
    Ticket,
    UserCheck,
    Package,
    Filter,
    ArrowRight,
    Calendar
} from "lucide-react";
import { useFetcher } from "@remix-run/react";

interface SearchResult {
    id: string;
    type: string;
    title: string;
    subtitle: string;
    description: string;
    url: string;
    metadata: Record<string, any>;
}

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAuth(request);

    const url = new URL(request.url);
    const query = url.searchParams.get("q") || "";
    const type = url.searchParams.get("type") || "all";

    return json({ user, initialQuery: query, initialType: type });
}

export default function SearchPage() {
    const { user, initialQuery, initialType } = useLoaderData<typeof loader>();
    const [searchParams, setSearchParams] = useSearchParams();
    const [results, setResults] = useState<SearchResult[]>([]);
    const [breakdown, setBreakdown] = useState<Record<string, number>>({});
    const [totalCount, setTotalCount] = useState(0);

    const searchFetcher = useFetcher();

    const query = searchParams.get("q") || initialQuery;
    const type = searchParams.get("type") || initialType;

    // Load search results
    useEffect(() => {
        if (query.trim()) {
            const params = new URLSearchParams();
            params.set("q", query);
            if (type !== "all") params.set("type", type);
            params.set("limit", "50");

            searchFetcher.load(`/api/search?${params.toString()}`);
        }
    }, [query, type]);

    // Update results when data is loaded
    useEffect(() => {
        if (searchFetcher.data && typeof searchFetcher.data === 'object' && 'results' in searchFetcher.data) {
            setResults(searchFetcher.data.results as SearchResult[]);
            setTotalCount(('totalCount' in searchFetcher.data ? searchFetcher.data.totalCount : 0) as number);
            if ('breakdown' in searchFetcher.data) {
                setBreakdown(searchFetcher.data.breakdown as Record<string, number>);
            }
        }
    }, [searchFetcher.data]);

    const handleTypeFilter = (newType: string) => {
        const newParams = new URLSearchParams(searchParams);
        if (newType === "all") {
            newParams.delete("type");
        } else {
            newParams.set("type", newType);
        }
        setSearchParams(newParams);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'customer': return <Users className="h-5 w-5 text-blue-500" />;
            case 'ticket': return <Ticket className="h-5 w-5 text-orange-500" />;
            case 'employee': return <UserCheck className="h-5 w-5 text-green-500" />;
            case 'package': return <Package className="h-5 w-5 text-purple-500" />;
            default: return <Search className="h-5 w-5 text-gray-500" />;
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
        <PageContainer className="py-8">
            <PageHeader
                title="Search Results"
                description={query ? `Results for "${query}"` : "Search across all data"}
            >
                <div className="w-full max-w-md">
                    <GlobalSearch
                        className="w-full"
                        placeholder="Search customers, tickets, employees..."
                    />
                </div>
            </PageHeader>

            {query && (
                <>
                    {/* Search Summary */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <p className="text-sm text-gray-600">
                                    {isLoading ? "Searching..." : `${totalCount} results found`}
                                </p>
                                {Object.keys(breakdown).length > 0 && (
                                    <div className="flex items-center space-x-2">
                                        {Object.entries(breakdown).map(([resultType, count]) => (
                                            count > 0 && (
                                                <Badge key={resultType} variant="outline" className="text-xs">
                                                    {count} {resultType}
                                                </Badge>
                                            )
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Type Filters */}
                    <div className="flex items-center space-x-2 mb-6">
                        <Filter className="h-4 w-4 text-gray-500" />
                        <div className="flex items-center space-x-2">
                            <Button
                                variant={type === "all" ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleTypeFilter("all")}
                            >
                                All Results
                            </Button>
                            <Button
                                variant={type === "customers" ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleTypeFilter("customers")}
                                className="flex items-center space-x-1"
                            >
                                <Users className="h-3 w-3" />
                                <span>Customers</span>
                                {breakdown.customers > 0 && (
                                    <Badge variant="secondary" className="text-xs ml-1">
                                        {breakdown.customers}
                                    </Badge>
                                )}
                            </Button>
                            <Button
                                variant={type === "tickets" ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleTypeFilter("tickets")}
                                className="flex items-center space-x-1"
                            >
                                <Ticket className="h-3 w-3" />
                                <span>Tickets</span>
                                {breakdown.tickets > 0 && (
                                    <Badge variant="secondary" className="text-xs ml-1">
                                        {breakdown.tickets}
                                    </Badge>
                                )}
                            </Button>
                            <Button
                                variant={type === "employees" ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleTypeFilter("employees")}
                                className="flex items-center space-x-1"
                            >
                                <UserCheck className="h-3 w-3" />
                                <span>Employees</span>
                                {breakdown.employees > 0 && (
                                    <Badge variant="secondary" className="text-xs ml-1">
                                        {breakdown.employees}
                                    </Badge>
                                )}
                            </Button>
                            <Button
                                variant={type === "packages" ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleTypeFilter("packages")}
                                className="flex items-center space-x-1"
                            >
                                <Package className="h-3 w-3" />
                                <span>Packages</span>
                                {breakdown.packages > 0 && (
                                    <Badge variant="secondary" className="text-xs ml-1">
                                        {breakdown.packages}
                                    </Badge>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Search Results */}
                    {isLoading ? (
                        <div className="text-center py-12">
                            <Search className="h-8 w-8 text-gray-300 mx-auto mb-4 animate-pulse" />
                            <p className="text-gray-500">Searching...</p>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="space-y-4">
                            {results.map((result) => (
                                <DataCard key={`${result.type}-${result.id}`} className="hover:shadow-md transition-shadow">
                                    <Link to={result.url} className="block">
                                        <div className="flex items-start space-x-4">
                                            <div className="mt-1">
                                                {getTypeIcon(result.type)}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                                                        {result.title}
                                                    </h3>
                                                    <ArrowRight className="h-4 w-4 text-gray-400 ml-2" />
                                                </div>

                                                <p className="text-sm text-gray-600 mt-1">
                                                    {result.subtitle}
                                                </p>

                                                <p className="text-sm text-gray-500 mt-2">
                                                    {result.description}
                                                </p>

                                                <div className="flex items-center space-x-2 mt-3">
                                                    <Badge variant="outline" className="text-xs">
                                                        {getTypeLabel(result.type)}
                                                    </Badge>
                                                    {result.metadata.status && (
                                                        <Badge className={`text-xs ${getStatusColor(result.type, result.metadata.status)}`}>
                                                            {result.metadata.status}
                                                        </Badge>
                                                    )}
                                                    {result.metadata.priority && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {result.metadata.priority} Priority
                                                        </Badge>
                                                    )}
                                                    {result.metadata.package && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {result.metadata.package}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </DataCard>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No results found
                            </h3>
                            <p className="text-gray-600 mb-4">
                                No results found for "{query}". Try adjusting your search terms.
                            </p>
                            <div className="text-sm text-gray-500">
                                <p>Search tips:</p>
                                <ul className="mt-2 space-y-1">
                                    <li>• Try different keywords</li>
                                    <li>• Check for typos</li>
                                    <li>• Use broader search terms</li>
                                    <li>• Search by name, email, phone, or ID</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </>
            )}

            {!query && (
                <div className="text-center py-12">
                    <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Start Your Search
                    </h3>
                    <p className="text-gray-600 mb-4">
                        Use the search bar above to find customers, tickets, employees, and packages.
                    </p>
                    <div className="text-sm text-gray-500">
                        <p>You can search for:</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 max-w-2xl mx-auto">
                            <div className="flex items-center space-x-2">
                                <Users className="h-4 w-4 text-blue-500" />
                                <span>Customers</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Ticket className="h-4 w-4 text-orange-500" />
                                <span>Tickets</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <UserCheck className="h-4 w-4 text-green-500" />
                                <span>Employees</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Package className="h-4 w-4 text-purple-500" />
                                <span>Packages</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </PageContainer>
    );
}