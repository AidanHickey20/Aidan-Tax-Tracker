import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || "sandbox"],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID!,
      "PLAID-SECRET": process.env.PLAID_SECRET!,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

/**
 * Normalize a merchant/transaction name into a stable key for MerchantRule
 * matching. Lowercase, strip trailing store numbers / punctuation / extra
 * whitespace so "STARBUCKS #1234" and "Starbucks" collapse together.
 */
export function normalizeMerchant(name: string): string {
  return name
    .toLowerCase()
    .replace(/[#*].*$/, "") // drop store/ref numbers after # or *
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
