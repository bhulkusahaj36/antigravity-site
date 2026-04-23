import os

path = 'css/style.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

broken_input = """body.light-mode .form-input {
  background: rgba(255, 248, 235, 0.7);
  border-color: rgba(180, 120, 30, 0.25);
  color: var(--bg-700);
}"""

fixed_input = """body.light-mode .form-input {
  background: rgba(255, 248, 235, 0.7);
  border-color: rgba(180, 120, 30, 0.25);
  color: var(--text-primary);
}"""

broken_select = """body.light-mode .form-select {
  background-color: rgba(255, 248, 235, 0.7);
  border-color: rgba(180, 120, 30, 0.25);
  color: var(--bg-700);
}"""

fixed_select = """body.light-mode .form-select {
  background-color: rgba(255, 248, 235, 0.7);
  border-color: rgba(180, 120, 30, 0.25);
  color: var(--text-primary);
}"""

content = content.replace(broken_input, fixed_input)
content = content.replace(broken_select, fixed_select)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Form input colors fixed.")
