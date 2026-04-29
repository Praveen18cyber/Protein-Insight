import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { Interaction } from "@shared/schema";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import clsx from "clsx";

interface InteractionTableProps {
  data: Interaction[];
  fullCount?: number;
}

const columnHelper = createColumnHelper<Interaction>();

const columns = [
  columnHelper.accessor("isIntraMolecular", {
    header: "Category",
    cell: (info) => (
      <span className={clsx(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase",
        info.getValue() ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"
      )}>
        {info.getValue() ? "Intra" : "Inter"}
      </span>
    ),
  }),
  columnHelper.accessor("type", {
    header: "Interaction Type",
    cell: (info) => (
      <span className={clsx(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        info.getValue() === "Hydrogen Bond" && "bg-blue-100 text-blue-800",
        info.getValue() === "Salt Bridge" && "bg-purple-100 text-purple-800",
        info.getValue() === "Hydrophobic" && "bg-orange-100 text-orange-800",
        info.getValue() === "Van der Waals" && "bg-gray-100 text-gray-800",
        info.getValue() === "Pi-Stacking" && "bg-pink-100 text-pink-800",
      )}>
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("proteinA", {
    header: "Protein A",
    cell: (info) => <span className="font-mono font-bold text-xs">{info.getValue()}</span>,
  }),
  columnHelper.accessor("chainA", {
    header: "Chain A",
    cell: (info) => <span className="bg-muted px-2 py-0.5 rounded text-xs font-bold">{info.getValue()}</span>,
  }),
  columnHelper.accessor("residueA", {
    header: "Residue A",
    cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
  }),
  columnHelper.accessor("proteinB", {
    header: "Protein B",
    cell: (info) => <span className="font-mono font-bold text-xs">{info.getValue()}</span>,
  }),
  columnHelper.accessor("chainB", {
    header: "Chain B",
    cell: (info) => <span className="bg-muted px-2 py-0.5 rounded text-xs font-bold">{info.getValue()}</span>,
  }),
  columnHelper.accessor("residueB", {
    header: "Residue B",
    cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
  }),
  columnHelper.accessor("distance", {
    header: "Distance (Å)",
    cell: (info) => <span className="font-mono text-xs font-semibold">{info.getValue().toFixed(2)}</span>,
  }),
];

export function InteractionTable({ data, fullCount }: InteractionTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "inter" | "intra">("all");

  const isTruncated = fullCount && fullCount > data.length;

  const filteredData = useMemo(() => {
    return data.filter(d => {
      if (categoryFilter === "inter") return !d.isIntraMolecular;
      if (categoryFilter === "intra") return d.isIntraMolecular;
      return true;
    });
  }, [data, categoryFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 15 },
      sorting: [{ id: "distance", desc: false }]
    }
  });

  return (
    <div className="space-y-4">
      {isTruncated && (
        <Alert className="bg-blue-50 border-blue-200 py-2">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700 text-xs">
            Displaying the top 1,000 interactions out of {fullCount.toLocaleString()}. 
            Use the "Download" buttons above to get the full dataset.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 min-w-fit">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Filter interactions..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        
        <div className="flex gap-2">
          {(["all", "inter", "intra"] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={clsx(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                categoryFilter === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {cat === "all" ? "All" : cat === "inter" ? "Inter-Protein" : "Intra-Protein"}
            </button>
          ))}
        </div>

        <div className="text-xs text-muted-foreground font-mono">
          {table.getFilteredRowModel().rows.length} / {data.length}
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted transition-colors"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: <ArrowUpDown className="w-3 h-3 text-primary" />,
                          desc: <ArrowUpDown className="w-3 h-3 text-primary rotate-180" />,
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border">
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-2 text-foreground">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                    No interactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="flex gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <span className="text-xs text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
      </div>
    </div>
  );
}
