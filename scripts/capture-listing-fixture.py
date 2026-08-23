import pathlib
import re

# Refresh with:
#   curl -sA "Mozilla/5.0" -L "<listing url>" -o car-raw.html && python scripts/capture-listing-fixture.py
raw = pathlib.Path('car-raw.html').read_text(encoding='utf-8', errors='replace')
title = re.search(r'<title>.*?</title>', raw, re.S | re.I)

# The listing data is spread across two payload blocks, so rather than one wide
# slice we take a tight window around each field we care about and merge the
# overlaps. The parser only ever matches locally, so this stays faithful.
NEEDLES = [
    '"ucInfoPageData"', '"car_model"', '"price"', '"installment"', '"depreciation"',
    '"coe_left"', '"mileage"', '"owner"', '"reg_date"', '"omv"', '"arf"', '"coe"',
    '"engine_cap"', '"road_tax"', '"curb_weight"', '"power"', '"dereg_value"',
    '"fuel_type"', 'Type of Vehicle', '1530094_1.jpg',
]

windows = []
for needle in NEEDLES:
    # Keys appear escaped in the source, so look for the escaped form too.
    for form in (needle, needle.replace('"', '\\"')):
        i = raw.find(form)
        if i >= 0:
            windows.append((max(0, i - 400), min(len(raw), i + len(form) + 400)))
            break

windows.sort()
merged = []
for start, end in windows:
    if merged and start <= merged[-1][1]:
        merged[-1] = (merged[-1][0], max(merged[-1][1], end))
    else:
        merged.append((start, end))

body = '\n<!-- ... -->\n'.join(raw[a:b] for a, b in merged)

frag = '\n'.join([
    '<!-- Trimmed capture of a real sgcarmart listing page, used to pin the parser. -->',
    '<html><head>' + (title.group(0) if title else '') + '</head><body>',
    '<script>', body, '</script>',
    '</body></html>',
])

out = pathlib.Path('__tests__/fixtures/sgcarmart-listing.html')
out.write_text(frag, encoding='utf-8')

unescaped = frag.replace('\\"', '"')
print('fixture bytes:', out.stat().st_size, 'windows:', len(merged))
for key in ['car_model', 'price', 'omv', 'arf', 'coe', 'engine_cap', 'road_tax',
            'curb_weight', 'power', 'depreciation', 'coe_left', 'mileage',
            'owner', 'reg_date', 'dereg_value', 'fuel_type']:
    print('  %-16s %s' % (key, 'ok' if re.search(r'"' + key + r'"\s*:', unescaped) else 'MISSING'))
print('  %-16s %s' % ('Type of Vehicle', 'ok' if 'Type of Vehicle' in unescaped else 'MISSING'))
print('  %-16s %s' % ('photos', sorted(set(re.findall(r'1530094_[0-9a-z]+\.jpg', unescaped)))))
