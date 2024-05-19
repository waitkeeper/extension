const { env } = require("process")

// 添加滚动监听器
function add_scrollend_event() {
  // 一个 class 属性为"user-panel main"的 div 元素<div>(<div class="user-panel main">)
  // 内包含一个 name 属性为"login"的 input 元素<input> (<input name="login"/>) ，如何选择
  // var el = document.querySelector("div.user-panel.main input[name='login']");
  console.log(`add scrollend event`)
  document.addEventListener(`scrollend`, (event) => {
    console.log(`========= document scrollends`)
    console.log(event)

    const sel = `#react-root > div > div > div.css-175oi2r.r-1f2l425.r-13qz1uu.r-417010.r-18u37iz > main > div > div > div > div.css-175oi2r.r-14lw9ot.r-jxzhtn.r-1ua6aaf.r-th6na.r-1phboty.r-16y2uox.r-184en5c.r-1c4cdxw.r-1t251xo.r-f8sm7e.r-13qz1uu.r-1ye8kvj > div > div.css-175oi2r.r-f8sm7e.r-13qz1uu.r-1ye8kvj`
    const e1 = document.querySelector(sel)
    console.log(e1)

    const targetElements = e1.querySelector(`section > div > div`)
    console.log(targetElements)
    // TODO
  })
}

// 选择需要观察变动的节点
const targetNode = document.getElementById("react-root")
// 观察器的配置（需要观察什么变动）
const config = { attributes: false, childList: true, subtree: true }

// 当观察到变动时执行的回调函数
const changeCallback = function (mutationsList, observer) {
  console.log(`changed ========= ${observer}`)
  // Use traditional 'for loops' for IE 11
  const div_arr = []
  for (let mutation of mutationsList) {
    // 从树上添加或移除一个或更多的子节点；参见 mutation.addedNodes 与 mutation.removedNodes
    if (mutation.type === "childList") {
      mutation.addedNodes.forEach((node) => {
        // console.log(node.nodeName)
        // console.log(node.nodeType)
        // console.log(node.getString())
        // console.log(node.nodeValue)
        // console.log(node.type)
        // console.log(node.tag)
        // console.log(node.className)
        // console.log(node.name)
        depthFirstTraversalRecursion(node, div_arr)
      })
      console.log(div_arr)
      for (let i = 0; i < div_arr.length; i++) {
        let node = div_arr[i]
        if (
          node.className === "css-175oi2r r-j5o65s r-qklmqi r-1adg3ll r-1ny4l3l"
        ) {
          console.log("**********************************")
          console.log(node)
          observer.disconnect()
          add_scrollend_event()
          return
        }
      }

      // mutation.target 中某节点的一个属性值被更改；该属性名称在 mutation.attributeName 中，
      // 该属性之前的值为 mutation.oldValue */
    } else if (mutation.type === "attributes") {
      console.log("The " + mutation.attributeName + " attribute was modified.")
    } else if (mutation.type === "characterData") {
      console.log(`the characterData is changed`)
    }
  }
}
function depthFirstTraversalRecursion(root, arr = []) {
  if (!root) return arr
  root.childNodes.forEach((node) => {
    if (node.nodeName === "DIV") {
      arr.push(node)
      depthFirstTraversalRecursion(node, arr)
    }
  })
}

// 创建一个观察器实例并传入回调函数
const observer = new MutationObserver(changeCallback)

// 之后，可停止观察
// observer.disconnect();

document.addEventListener("DOMContentLoaded", function (e1) {
  console.log(`document is ready`)
  console.log(e1)
  // 选择需要观察变动的节点
  const targetNode = document.getElementById("react-root")
  console.log(`targetNode:${targetNode}`)
  // 以上述配置开始观察目标节点
  observer.observe(targetNode, config)
})
