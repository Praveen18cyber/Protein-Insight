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
import { ArrowUpDown, ChevronLeft, ChevronRight, Search, Download } from "lucide-react";
import clsx from "clsx";

interface InteractionTableProps {
  data: Interaction[];
}

const columnHelper = createColumnHelper<Interaction>();

const columns = [
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
        info.getValue() === "Other" && "bg-gray-100 text-gray-800",
      )}>
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("distance", {
    header: ({ column }) => (
      <div className="text-right flex justify-end items-center gap-1">
        Distance (Å)
      </div>
    ),
    cell: (info) => <div className="text-right font-mono">{info.getValue().toFixed(2)}</div>,
  }),
  columnHelper.accessor("residueA", {
    header: "Residue A",
    cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
  }),
  columnHelper.accessor("residueB", {
    header: "Residue B",
    cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
  }),
  columnHelper.accessor("chainID", {
      header: "Chain Pair",
      cell: (info) => (
          <div className="flex items-center gap-1 text-xs">
              <span className="font-bold bg-muted px-1.5 rounded">{info.row.original.proteinA}</span>
              <span className="text-muted-foreground">↔</span>
              <span className="font-bold bg-muted px-1.5 rounded">{info.row.original.proteinB}</span>
          </div>
      )
  })
];

export function InteractionTable({ data }: InteractionTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
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
        pagination: {
            pageSize: 10,
        }
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Filter interactions..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <div className="text-xs text-muted-foreground font-mono">
            {table.getFilteredRowModel().rows.length} results
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted transition-colors"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: <ArrowUpDown className="w-3 h-3 text-primary rotate-180" />,
                          desc: <ArrowUpDown className="w-3 h-3 text-primary" />,
                        }[header.column.getIsSorted() as string] ?? (
                          <ArrowUpDown className="w-3 h-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100" />
                        )}
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
                      <td key={cell.id} className="px-6 py-3 text-sm text-foreground">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-muted-foreground">
                    No interactions found matching filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="flex gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <span className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </span>
      </div>
    </div>
  );
}
