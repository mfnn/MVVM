class Observer {
    constructor(data) {
        this.observer(data)
    }
    observer(data) {
        //要对这个data数据原有的属性改成set和get的形式
        if (!data || typeof data !== 'object') { //如果数据不存在或者不是对象
            return;
        }
        //要将数据一一劫持，先获取到data的key和value
        Object.keys(data).forEach(key => { //该方法是将对象先转换成数组，再循环
            //劫持(定义一个函数，数据响应式)
            this.defineReactive(data, key, data[key]);
            //深度递归劫持，这里的递归只会为初始的data中的数据进行劫持（添加set和get方法），如果在defineReactive函数中使用set新增加则不会进行劫持
            this.observer(data[key]);
        })
    }
    //定义响应式
    defineReactive(obj, key, value) {
        //在获取某个值的时候，可以在获取或更改值的时候，做一些处理
        let that = this;
        console.log(that, this);
        let dep = new Dep(); //每个变化的数据都会对应一个数组，这个数组是存放所有更新的操作
        Object.defineProperty(obj, key, {
            enumerable: true,
            configurable: true,
            get() { //当取值时，调用的方法
                Dep.target && dep.addSub(Dep.target);
                return value;
            },
            set(newValue) { //当给data属性中设置值的时候，更改获取的属性的值
                if (newValue !== value) {
                    console.log(this, 'this'); //这个this指向的是被修改的值
                    //但是这里的this不是Observer的实例,所以需要在最初保存一下当前this指向
                    that.observer(newValue); //如果是对象继续劫持
                    value = newValue;
                    dep.notify(); //通知所有人数据更新了
                }
            }
        })
    }

    /**
     * 以上就实现了数据劫持
     */
}

/**
 * 发布订阅
 */
class Dep {
    constructor() {
        //订阅的数组
        this.subs = [];
    }
    //添加订阅者
    addSub(watcher) {
        this.subs.push(watcher);
    }
    //通知
    notify() {
        this.subs.forEach(watcher => {
            watcher.update()
        })
    }
}

//解释之后的关联
// new Watcher的时候，会从实例上获取值，即调用get()方法，这时候在Dep实例上增加一个target
// Dep.target=this;  //将当前watcher实例放入到tartget中
//在complie中会new Watch，这时候就会将Watcher实例给target，之后在调用this.getVal(this.vm, this.expr);时会调用observer中的get()
//利用上面，所以在调用之前在Observer中的defineReactive中加入 let dep=new Dep(),这时便有了实例，再在实例中添加dep.target&&dep.addSub(Dep.target);