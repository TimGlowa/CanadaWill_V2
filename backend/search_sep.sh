#!/bin/bash

HOST="https://$(az webapp show -g CanadaWill-prod2-rg -n canadawill-ingest --query defaultHostName -o tsv)"
FROM="$(node -e 'd=new Date(Date.now()-30*24*3600*1000);process.stdout.write(d.toISOString().slice(0,10))')"
mkdir -p _sep_out

echo "Searching from date: $FROM"
echo "Host: $HOST"

# Get all MLAs and MPs
jq -r '[ .[] | select(.office=="Member of Legislative Assembly" or .office=="Member of Parliament") | {slug, name:.fullName} ] | unique_by(.slug) | .[] | @base64' express-ingest/data/ab-roster-transformed.json | \
while read -r row; do
    slug=$(echo "$row" | base64 -d | jq -r .slug)
    name=$(echo "$row" | base64 -d | jq -r .name)
    
    echo ">>> Processing $slug ($name)"
    
    # Build query
    Q=$(printf "%s" "\"$name\" AND (Alberta separation OR Alberta independence OR Alberta sovereignty OR referendum OR secede OR break from Canada OR leave Canada)" | jq -sRr @uri)
    
    # Get NewsAPI results
    NA=$(curl -fsS "$HOST/api/newsapi/everything?q=$Q&language=en&from=$FROM&pageSize=100" 2>/dev/null || echo "{}")
    
    # Get NewsData results
    ND=$(curl -fsS "$HOST/api/newsdata?q=$Q&language=en&from_date=$FROM&size=100" 2>/dev/null || echo "{}")
    
    # Save results
    jq -n --arg slug "$slug" --arg name "$name" --arg from "$FROM" --argjson na "$NA" --argjson nd "$ND" '{slug:$slug,name:$name,from:$from,newsapi:$na,newsdata:$nd}' > "_sep_out/$slug.json"
    
    echo ">>> Completed $slug"
done

echo "Search completed. Analyzing results..." 