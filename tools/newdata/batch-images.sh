set -u
cd "$(dirname "$0")/../.."
i=0
while read -r batch; do
  i=$((i+1))
  echo "=== batch $i: $batch"
  ONLY="$batch" node tools/images.js 2>&1 | grep -v "no slug match" | tail -3 || echo "BATCH $i FAILED"
done < <(paste -sd, tools/newdata/todo-slugs.txt | tr ',' '\n' | paste -d, - - - - -)
echo "ALL BATCHES DONE"
