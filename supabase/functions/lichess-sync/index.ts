import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

Deno.serve(async (req) => {
    try {
        if (req.method === "OPTIONS") {
            return new Response("ok", { headers: corsHeaders });
        }

        if (req.method !== "POST") {
            return new Response(JSON.stringify({ error: "Method not allowed" }), {
                status: 405,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

        if (!supabaseUrl || !anonKey) {
            return new Response(JSON.stringify({ error: "Missing Supabase env vars" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const supabaseUser = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: authHeader } }
        });
        const { data: userData, error: userError } = await supabaseUser.auth.getUser();

        if (userError || !userData?.user) {
            return new Response(JSON.stringify({ error: "Invalid user token" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const body = await req.json().catch(() => ({}));
        const maxGames = Number.isFinite(body?.max) ? Number(body.max) : 50;
        const perfType = typeof body?.perfType === "string" ? body.perfType : "rapid";

        const { data: lichessConfig, error: lichessError } = await supabaseUser
            .from("user_lichess")
            .select("lichess_username, api_token")
            .eq("user_id", userData.user.id)
            .maybeSingle();

        if (lichessError || !lichessConfig) {
            return new Response(JSON.stringify({ count: 0, warning: "Lichess config missing" }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const lichessHeaders: Record<string, string> = {
            Accept: "application/x-ndjson"
        };
        if (lichessConfig.api_token && lichessConfig.api_token.trim().length > 0) {
            lichessHeaders.Authorization = `Bearer ${lichessConfig.api_token.trim()}`;
        }

        let response: Response;
        try {
            response = await fetch(
                `https://lichess.org/api/games/user/${lichessConfig.lichess_username}?max=${maxGames}&perfType=${perfType}&pgnInJson=true`,
                { headers: lichessHeaders }
            );
        } catch (fetchError) {
            return new Response(
                JSON.stringify({ error: `Lichess fetch failed: ${String(fetchError)}` }),
                { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!response.ok) {
            const errorBody = await response.text();
            return new Response(
                JSON.stringify({ error: `Lichess API returned ${response.status}: ${errorBody}` }),
                { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const text = await response.text();
        const lichessGames = text
            .split("\n")
            .filter((line) => line.trim())
            .map((line) => {
                try {
                    const g = JSON.parse(line);
                    return {
                        user_id: userData.user.id,
                        external_id: g.id,
                        created_at: new Date(g.createdAt).toISOString(),
                        white_player: g.players.white.user?.name || "AI",
                        black_player: g.players.black.user?.name || "AI",
                        result: g.winner === "white" ? "white_won" : g.winner === "black" ? "black_won" : "draw",
                        pgn: g.pgn,
                        source: "lichess"
                    };
                } catch {
                    return null;
                }
            })
            .filter((g) => g !== null);

        if (lichessGames.length === 0) {
            return new Response(JSON.stringify({ count: 0 }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const { error: upsertError } = await supabaseUser
            .from("partie")
            .upsert(lichessGames, { onConflict: "user_id,external_id" });

        if (upsertError) {
            return new Response(JSON.stringify({ error: upsertError.message }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        return new Response(JSON.stringify({ count: lichessGames.length }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    } catch (error) {
        const message = error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error);
        console.error("lichess-sync unexpected error:", message);
        return new Response(JSON.stringify({ error: `Unexpected error: ${message}` }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
