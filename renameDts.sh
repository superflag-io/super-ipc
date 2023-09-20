cd build
#for file in *.d.ts; do
#    mv -- "$file" "${file%.d.ts}.d.mts"
#done
#rename "s/.d.ts$/.d.mts/" **.d.ts

for f in `find . -iname '*.d.ts' -type f -print`;do
  mv "$f" ${f%.d.ts}.d.mts;
done
