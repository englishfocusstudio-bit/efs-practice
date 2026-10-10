const {test}=require('node:test'),a=require('node:assert/strict');const {workbook}=require('../excel.js');
// Independent ZIP/XML reader using Python stdlib. Does not require Excel installation.
test('real OOXML ZIP preserves leading zeros, Unicode and formula-like text as strings',()=>{const bytes=workbook([{student:'=SUM(A1)',code:'001',title:'Bài kiểm tra & <Unit>',score:1.5,max:2,savedAt:'2026-10-10',keyRevision:2,items:[{number:1,answer:'school',earned:1.5,points:2}]}]);const {spawnSync}=require('node:child_process');const python=spawnSync('python',['-c',`import sys,zipfile,io,xml.etree.ElementTree as E
z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))
assert z.testzip() is None
for name in z.namelist(): E.fromstring(z.read(name))
r=E.fromstring(z.read('xl/worksheets/sheet1.xml')); ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
cells={c.attrib['r']:c for c in r.findall('.//m:c',ns)}
assert cells['A2'].attrib['t']=='inlineStr'
assert cells['A2'].find('.//m:t',ns).text=='=SUM(A1)'
assert cells['B2'].find('.//m:t',ns).text=='001'
assert cells['C2'].find('.//m:t',ns).text=='Bài kiểm tra & <Unit>'
assert cells['D2'].find('m:v',ns).text=='1.5'
assert not r.findall('.//m:f',ns)
`],{input:bytes});a.equal(python.status,0,python.stderr.toString());});
