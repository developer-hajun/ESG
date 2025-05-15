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

    if (!query) return;

    const suggestions = companyNames.filter(name =>
      name.toLowerCase().includes(query)
    ).slice(0, 10);

    suggestions.forEach(name => {
      const item = document.createElement('div');
      item.textContent = name;
      item.addEventListener('click', () => {
        input.value = name;
        list.innerHTML = '';
      });
      list.appendChild(item);
    });
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !list.contains(e.target)) {
      list.innerHTML = '';
    }
  });
}

setupAutocomplete("companyInputA", "autocompleteA");
setupAutocomplete("companyInputB", "autocompleteB");
