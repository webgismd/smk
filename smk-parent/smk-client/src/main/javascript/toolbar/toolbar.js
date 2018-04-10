include.module( 'toolbar', [ 'vue', 'toolbar.toolbar-html' ], function ( inc ) {

    function Toolbar( smk ) {
        var self = this

        this.model = {
            tools: [],
        }

        var el = smk.addToOverlay( inc[ 'toolbar.toolbar-html' ] )

        this.vm = new Vue( {
            el: el,
            data: this.model,
            methods: {
            //     debug: function ( x ) { console.log( arguments ); return x },
            // },
            // beforeUpdate: function () {
            //     console.log( this )
                trigger: function ( event, arg ) {
                    smk.emit( event, arg )
                    // console.log( arguments )
                }
            }
        } )
    }

    Toolbar.prototype.add = function ( tool ) {
        this.model.tools.push( {
            id: tool.id,
            type: tool.type,
            widgetComponent: tool.widgetComponent,
            widget: tool.widget
        } )
    }

    SMK.TYPE.Toolbar = Toolbar

    return Toolbar

} )