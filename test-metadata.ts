import axios from "axios";
import fs from "fs";

const RCSB_API_URL = "https://data.rcsb.org/graphql";
async function main() {
  const query = `
    query($id: String!) {
      entry(entry_id: $id) {
        rcsb_entry_info {
          resolution_combined
        }
        exptl {
          method
        }
        rcsb_accession_info {
          initial_release_date
        }
        polymer_entities {
          rcsb_polymer_entity_container_identifiers {
            auth_asym_ids
            uniprot_ids
          }
          rcsb_entity_source_organism {
            scientific_name
          }
          entity_poly {
            pdbx_seq_one_letter_code
          }
        }
        struct_conf {
          id
        }
      }
    }
  `;
  try {
    const response = await axios.post(RCSB_API_URL, {
      query,
      variables: { id: "1CRN" }
    });
    fs.writeFileSync("gql-error.json", JSON.stringify(response.data, null, 2));
  } catch(e: any) {
    fs.writeFileSync("gql-error.json", JSON.stringify(e.response?.data || e.message, null, 2));
  }
}
main();
