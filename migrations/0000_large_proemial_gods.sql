CREATE TABLE "analysis_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"protein_id" integer,
	"title" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"config" jsonb,
	"result_summary" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chain_pair_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"chain_a" text NOT NULL,
	"chain_b" text NOT NULL,
	"inter_count" integer NOT NULL,
	"intra_count" integer NOT NULL,
	"avg_distance" double precision
);
--> statement-breakpoint
CREATE TABLE "interaction_type_counts" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"interaction_type" text NOT NULL,
	"interaction_count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mutation_impacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"residue_position" integer NOT NULL,
	"original_residue" text NOT NULL,
	"mutant_residue" text NOT NULL,
	"predicted_delta_g" double precision
);
--> statement-breakpoint
CREATE TABLE "protein_metadata" (
	"id" serial PRIMARY KEY NOT NULL,
	"pdb_id" text,
	"name" text NOT NULL,
	"source_type" text NOT NULL,
	"resolution" double precision,
	"organism" text,
	"method" text,
	"year" integer,
	"metadata" jsonb,
	"pdb_content" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "protein_metadata_pdb_id_unique" UNIQUE("pdb_id")
);
--> statement-breakpoint
ALTER TABLE "analysis_sessions" ADD CONSTRAINT "analysis_sessions_protein_id_protein_metadata_id_fk" FOREIGN KEY ("protein_id") REFERENCES "public"."protein_metadata"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chain_pair_stats" ADD CONSTRAINT "chain_pair_stats_session_id_analysis_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."analysis_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interaction_type_counts" ADD CONSTRAINT "interaction_type_counts_session_id_analysis_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."analysis_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutation_impacts" ADD CONSTRAINT "mutation_impacts_session_id_analysis_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."analysis_sessions"("id") ON DELETE no action ON UPDATE no action;