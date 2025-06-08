let companyNames = [];

fetch('/api/companies')
  .then(res => res.json())
  .then(data => {
    companyNames = data.map(c => c.business_name);
  });

function setupAutocomplete(inputId, listId) {
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);

  input.addEventListener('input', () => {
  const query = input.value.toLowerCase();
  list.innerHTML = '';

  if (!query) {
    list.style.display = 'none';  // 추가
    return;
  }

  const suggestions = companyNames.filter(name =>
    name.toLowerCase().includes(query)
  ).slice(0, 10);

  if (suggestions.length === 0) {
    list.style.display = 'none';  // 추가
    return;
  }

  suggestions.forEach(name => {
    const item = document.createElement('div');
    item.textContent = name;
    item.addEventListener('click', () => {
      input.value = name;
      list.innerHTML = '';
      list.style.display = 'none'; // 클릭 후 숨기기
    });
    list.appendChild(item);
  });

  list.style.display = 'block';  // ✅ 항목 있으면 보여줌
});

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !list.contains(e.target)) {
      list.innerHTML = '';
    }
  });
}

setupAutocomplete("companyInputA", "autocompleteA");
setupAutocomplete("companyInputB", "autocompleteB");
