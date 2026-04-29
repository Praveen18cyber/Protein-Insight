# BioInteract - Protein-Protein Interaction Analysis Tool

## Overview

BioInteract is a bioinformatics web application that performs protein-protein interaction (PPI) analysis from PDB structures. The tool accepts PDB IDs or file uploads, analyzes non-covalent interactions between proteins (hydrogen bonds, salt bridges, hydrophobic interactions, van der Waals), computes binding affinity indices, and provides 3D visualization with interactive data tables and charts.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Data Visualization**: Recharts for charts, NGL Viewer for 3D protein visualization
- **Tables**: TanStack React Table for sortable/filterable interaction data

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **Build Tool**: esbuild for server bundling, Vite for client
- **API Design**: RESTful endpoints with Zod validation
- **Database ORM**: Drizzle ORM with PostgreSQL dialect

### Data Flow
1. User submits PDB ID or uploads .pdb file via the analysis form
2. Server fetches structure from RCSB PDB or processes uploaded content
3. PDB parser extracts atomic coordinates and chain information
4. Interaction analyzer detects inter/intra-protein contacts using distance-based algorithms
5. Binding Affinity Index calculated using weighted scoring formula
6. Results stored in database and returned to client for visualization

### Key Design Decisions

**Monorepo Structure**: Client, server, and shared code colocated for type sharing
- `client/` - React frontend application
- `server/` - Express API server
- `shared/` - Shared TypeScript types, schemas, and route definitions

**Type-Safe API Contract**: Zod schemas in `shared/routes.ts` define request/response types used by both client and server, ensuring end-to-end type safety.

**Scientific Analysis Pipeline**: The `server/services/pdb.ts` module handles:
- PDB file parsing following the fixed-width PDB format specification
- Interaction detection using distance thresholds for different bond types
- Binding Affinity Index computation using a weighted formula

**Database Schema Design**: Normalized tables for:
- `protein_metadata` - PDB structure information
- `analysis_sessions` - Individual analysis runs with status tracking
- `interaction_type_counts` - Categorized interaction statistics
- `chain_pair_stats` - Chain-to-chain interaction metrics

## External Dependencies

### Database
- **PostgreSQL**: Primary data store via `DATABASE_URL` environment variable
- **Drizzle ORM**: Schema management and query building
- **Drizzle Kit**: Database migrations via `npm run db:push`

### External APIs
- **RCSB PDB**: Fetches protein structures by PDB ID from `https://files.rcsb.org/download/{ID}.pdb`

### Key NPM Packages
- `ngl` - WebGL-based 3D molecular visualization
- `recharts` - React charting library for interaction statistics
- `@tanstack/react-query` - Server state management with caching
- `@tanstack/react-table` - Headless table for data display
- `drizzle-orm` / `drizzle-zod` - Type-safe database operations
- `zod` - Runtime schema validation

### Development Tools
- Vite dev server with HMR for frontend development
- TSX for running TypeScript server directly
- Replit-specific plugins for development experience