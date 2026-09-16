const fs = require('fs');

let pageContent = fs.readFileSync('d:/booran-warranty-new/app/(portal)/cases/page.tsx', 'utf8');

// Fix loadCases
pageContent = pageContent.replace(
  `      const data = await api.getWarrantyCases(params);
      setCases(data);`,
  `      params.limit = 100;
      const res = await api.getWarrantyCases(params);
      const caseList = Array.isArray(res) ? res : (res?.data || []);
      setCases(caseList);`
);

// Fix cases.filter
pageContent = pageContent.replace(
  `  const filteredCases = cases.filter((c) => {`,
  `  const filteredCases = (Array.isArray(cases) ? cases : []).filter((c) => {`
);

fs.writeFileSync('d:/booran-warranty-new/app/(portal)/cases/page.tsx', pageContent, 'utf8');
console.log('Fixed d:/booran-warranty-new/app/(portal)/cases/page.tsx');
