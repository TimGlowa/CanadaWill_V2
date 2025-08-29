module.exports = async function (context, req) {
    context.res = {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: {
            ok: true,
            service: "functions",
            time: new Date().toISOString()
        }
    };
}; 