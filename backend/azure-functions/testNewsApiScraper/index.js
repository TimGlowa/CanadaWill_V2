module.exports = async function (context, req) {
    const corsHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };
    
    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
        context.res = {
            status: 204,
            headers: corsHeaders
        };
        return;
    }
    
    // Get slug from query (GET) or body (POST)
    let slug;
    if (req.method === 'GET') {
        slug = (req.query || {}).slug;
    } else {
        slug = (req.body || {}).slug;
    }
    
    if (!slug) {
        context.res = {
            status: 400,
            headers: corsHeaders,
            body: {
                ok: false,
                error: "slug required"
            }
        };
        return;
    }
    
    context.log(`Ingest request for ${slug}`);
    
    context.res = {
        status: 200,
        headers: corsHeaders,
        body: {
            ok: true,
            slug: slug
        }
    };
}; 