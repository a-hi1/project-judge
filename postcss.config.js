const tailwindcss = require('tailwindcss')
const autoprefixer = require('autoprefixer')

function cleanForWxss(css) {
  // 收集 CSS 变量值
  const vars = {}
  css.walkDecls((decl) => {
    if (decl.prop && decl.prop.startsWith('--')) {
      vars[decl.prop] = decl.value
    }
  })

  // 替换 var() 为实际值
  css.walkDecls((decl) => {
    if (decl.value && decl.value.includes('var(')) {
      decl.value = decl.value.replace(/var\(([^,)]+)(?:,\s*([^)]+))?\)/g, (match, name, fallback) => {
        const val = vars[name.trim()]
        if (val) return val
        if (fallback) return fallback.trim()
        return 'initial'
      })
    }
  })

  // 删除 CSS 变量声明
  css.walkDecls((decl) => {
    if (decl.prop && decl.prop.startsWith('--')) {
      decl.remove()
    }
  })

  // 如果声明值仍然包含 var()，直接删除整个声明
  css.walkDecls((decl) => {
    if (decl.value && decl.value.includes('var(')) {
      decl.remove()
    }
  })

  // 清理选择器中的反斜杠
  css.walkRules((rule) => {
    if (rule.selector) {
      rule.selector = rule.selector.replace(/\\/g, '')
    }
  })

  // 删除只包含被删除声明的空规则
  css.walkRules((rule) => {
    if (rule.nodes && rule.nodes.length === 0) {
      rule.remove()
    }
  })
}

module.exports = {
  plugins: [tailwindcss, autoprefixer, cleanForWxss],
}
