class Compile {
    //vm-->MVVM中传入的第二个参数就是MVVM的实例，即new MVVM()
    constructor(el, vm) {
        this.el = this.isElementNode(el) ? el : document.querySelector(el); //传入的可能是 #app或者document.getElementById()
        this.vm = vm;
        //防止用户输入的既不是“#el”字符春也不是document节点
        if (this.el) {
            //如果这个元素能够获取到，我们才开始编译
            //1.先把真实的DOM移入到内存中（优化性能） -->使用节点碎片 fragment
            let fragment = this.nodeToFragment(this.el);
            //2.编译=>提取想要的元素节点（v-model）和文本节点{{}}
            this.compile(fragment)
            //3.把编译好的fragment在放回到页面中
            this.el.appendChild(fragment)

        }
    }

    /**
     * 专门写一些辅助的方法
     */

    //1. 判断一个节点是不是元素节点
    isElementNode(node) {
        return node.nodeType === 1
    }

    //2.判断是不是指令
    isDirective(name) {
        return name.includes('v-');
    }

    /**
     * 核心方法
     */
    nodeToFragment(el) { //需要将el中的内容全部放入到内存中
        //文档碎片，不是真正的DOM，是内存中的节点
        let fragment = document.createDocumentFragment();
        let firstChild;
        while (firstChild = el.firstChild) {
            //将el中的真实节点一个一个的移入到文档碎片中（el.firstChild指文档中的第一个节点，这一个节点里面可能嵌套很多个节点，但是都没关系，都会一次取走）
            fragment.appendChild(firstChild);
        }
        return fragment; // 内存中的节点
    }
    compile(fragment) {
        //需要递归
        let childNodes = fragment.childNodes; //只拿到第一层（父级），拿不到嵌套层的
        Array.from(childNodes).forEach(node => {
            if (this.isElementNode(node)) {
                //这里的需要编译元素
                this.compileElement(node);
                //是元素节点，还需要继续深入的检查（如果是元素节点，有可能节点里面会嵌套节点，所以要使用递归）
                this.compile(node) //因为外层是箭头函数，所以this始终指向Compile实例
            } else {
                //是文本节点
                //这里需要编译文本
                this.compileText(node)
            }
        })

    }
    compileElement(node) {
        //编译带v-model、v-text等的（取节点的属性）
        let attrs = node.attributes; //取出当前节点的属性
        Array.from(attrs).forEach(attr => {
            //判断属性名字是不是包含v-
            let attrName = attr.name;
            if (this.isDirective(attrName)) {
                //取到对应的值（即从data中取到message（示例）），放到节点中
                let expr = attr.value;
                let [, type] = attrName.split('-') //解构赋值
                //node  this.vm.$data expr  //这里可能有v-model或v-text  还有可能有v-html（这里只处理前两种）
                CompileUtil[type](node, this.vm, expr)
            }
        })
    }
    compileText(node) {
        //编译带{{}}
        let expr = node.textContent; //取文本中的内容
        let reg = /\{\{([^}]+)\}\}/g;
        if (reg.test(expr)) {
            //node this.vm.$data expr
            CompileUtil['text'](node, this.vm, expr)
        }
    }
}

CompileUtil = {
    getVal(vm, expr) { //获取实例上对应的数据
        expr = expr.split('.');
        return expr.reduce((prev, next) => { //vm.$data.a....
            return prev[next];
        }, vm.$data)
    },
    getTextVal(vm, expr) { //获取编译文本后的结果
        return expr.replace(/\{\{([^}]+)\}\}/g, (...arguments) => {
            console.log('arguments', arguments);
            return this.getVal(vm, arguments[1])
        })
    },
    text(node, vm, expr) { //文本处理
        let updateFn = this.updater['textUpdater'];
        //注意：expr有可能只是单纯的message属性名，也有可能是messag.a 这种嵌套的属性名
        //console.log(expr)   -->{{massge}},不仅有属性名还带有两个括号，需要进行处理
        //replace的第二个参数可以是具体值，用于替换掉第一个参数匹配到的值，也可以是一个函数，
        //函数的返回值将替换掉第一个参数匹配到的结果
        let value = this.getTextVal(vm, expr)
        //{{a}}  {{b}}
        expr.replace(/\{\{([^}]+)\}\}/g, (...arguments) => {
            console.log('arguments', arguments);
            new Watcher(vm, arguments[1], (newValue) => {
                //如果数据变化了，文本节点需要重新获取依赖的数据更新稳重的内容
                updateFn && updateFn(node, this.getTextVal(vm, expr))
            })
        })
        updateFn && updateFn(node, value)
    },
    //为下面输入框的改变值方法
    setVal(vm, expr, value) {
        expr = expr.split('.');
        return expr.reduce((prev, next, currentIndex) => {
            if (currentIndex === expr.length - 1) {
                return prev[next] = value;
            }
            return prev[next]
        }, vm.$data)
    },
    model(node, vm, expr) { //输入框的处理
        let updateFn = this.updater['modelUpdater'];
        //这里应该加一个监控，数据变化了，应该调用这个watch的callback
        new Watcher(vm, expr, (newValue) => {
            //当值变化后，会调用cb将新值传递过来（）
            updateFn && updateFn(node, this.getVal(vm, expr))
        })
        //为节点添加点击事件
        node.addEventListener('input', e => {
            let newValue = e.target.value;
            this.setVal(vm, expr, newValue);
        })

        updateFn && updateFn(node, this.getVal(vm, expr))
    },
    updater: {
        //文本更新
        textUpdater(node, value) {
            node.textContent = value
        },
        //输入框更新
        modelUpdater(node, value) {
            node.value = value
        }
    }


}