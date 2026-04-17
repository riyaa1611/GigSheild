import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const createNoopQuery = () => {
  const query = {
    select: () => query,
    gte: () => query,
    eq: () => query,
    order: () => query,
    limit: () => query,
    then: (resolve) => Promise.resolve({ data: [], count: 0 }).then(resolve),
  };

  return query;
};

const createNoopChannel = () => ({
  on: () => createNoopChannel(),
  subscribe: () => createNoopChannel(),
});

const createNoopClient = () => ({
  from: () => createNoopQuery(),
  channel: () => createNoopChannel(),
  removeChannel: async () => undefined,
  functions: {
    invoke: async () => {
      throw new Error("Supabase env is not configured");
    },
  },
});

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { realtime: { params: { eventsPerSecond: 10 } } })
  : createNoopClient();
