/**
 * MVVM的功能：桥梁
 */
class MVVM {
    constructor(options) {
        //把属性挂载在实例上
        this.$el = options.el;
        this.$data = options.data;

        //判断是否有可编译的模板（因为编译的前提肯定是需要有模板的）
        if (this.$el) {
            //数据劫持，把对象的所有属性改成get和set方法
            new Observer(this.$data);
            this.proxyData(this.$data);
            //用数据和元素进行编译(单独写一个Compile类来处理)
            new Compile(this.$el, this); //第二个是this的原因：因为除了data晦气还会加载很多东西
        }
    }
    proxyData(data) {
        Object.keys(data).forEach(key => {
            Object.defineProperty(this, key, {
                get() {
                    return data[key]
                },
                set(newValue) {
                    data[key] = newValue
                }
            })
        })
    }
}