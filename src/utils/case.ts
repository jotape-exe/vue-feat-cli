export const pascalCase = (str: string) =>
  str.replace(/(^\w|[-_]\w)/g, (m) => m.replace(/[-_]/, '').toUpperCase())

export const camelCase = (str: string) => {
  const p = pascalCase(str)
  return p.charAt(0).toLowerCase() + p.slice(1)
}

export const kebabCase = (str: string) =>
  str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()