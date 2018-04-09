include.module( 'tool', [ 'smk', 'jquery', 'event' ], function () {

    var ToolEvent = SMK.TYPE.Event.define( [
        'changedVisible',
        'changedEnabled',
        'changedActive',
    ] )
    // _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
    //
    function Tool( option ) {
        ToolEvent.prototype.constructor.call( this )

        this.makeProp( 'id', null )
        this.makeProp( 'title', null )
        this.makeProp( 'visible', true, 'changedVisible' )
        this.makeProp( 'enabled', true, 'changedEnabled' )
        this.makeProp( 'active', false, 'changedActive' )

        $.extend( this, option )
    }

    Tool.prototype.type = 'unknown'
    Tool.prototype.order = 1
    Tool.prototype.position = 'toolbar'

    SMK.TYPE.Tool = Tool

    $.extend( Tool.prototype, ToolEvent.prototype )
    Tool.prototype.afterInitialize = []
    // _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
    //
    Tool.prototype.makeProp = function ( name, initial, event ) {
        var self = this

        if ( !this.widget ) this.widget = {}
        if ( !this.panel ) this.panel = {}

        self.widget[ name ] = initial
        self.panel[ name ] = initial
        Object.defineProperty( self, name, {
            get: function () { return self.widget[ name ] },
            set: function ( v ) {
                if ( v == self.widget[ name ] ) return
                self.widget[ name ] = v
                self.panel[ name ] = v
                if ( event ) self[ event ].call( self )
                return self
            }
        } )
    }

    Tool.prototype.makePropWidget = function ( name, initial, event ) {
        var self = this

        if ( !this.widget ) this.widget = {}

        self.widget[ name ] = initial
        Object.defineProperty( self, name, {
            get: function () { return self.widget[ name ] },
            set: function ( v ) {
                if ( v == self.widget[ name ] ) return
                self.widget[ name ] = v
                if ( event ) self[ event ].call( self )
                return self
            }
        } )
    }

    Tool.prototype.makePropPanel = function ( name, initial, event ) {
        var self = this

        if ( !this.panel ) this.panel = {}

        self.panel[ name ] = initial
        Object.defineProperty( self, name, {
            get: function () { return self.panel[ name ] },
            set: function ( v ) {
                if ( v == self.panel[ name ] ) return
                self.panel[ name ] = v
                if ( event ) self[ event ].call( self )
                return self
            }
        } )
    }
    // _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
    //
    Tool.prototype.initialize = function ( smk ) {
        var self = this

        var aux = {}
        return SMK.UTIL.waitAll( [
            smk.getToolbar().then( function ( toolbar ) { aux.toolbar = toolbar } ),
            smk.getSidepanel().then( function ( panel ) { aux.panel = panel } ),
            smk.getMenu().then( function ( menu ) { aux.menu = menu } ),
        ] )
        .then( function () {
            switch ( self.position ) {
            case 'toolbar':
                if ( self.widgetComponent )
                    aux.toolbar.add( self )

                if ( self.panelComponent )
                    aux.panel.add( self )

                aux.widget = aux.toolbar
                break;

            case 'menu':
                aux.menu.add( self )
                aux.widget = aux.panel
                break;
            }

            // aux.on = function ( source, event, handler ) {
            //     if ( typeof handler != 'function' && typeof event == 'function' ) {
            //         handler = event
            //         event = source
            //         source = 'panel'
            //     }

            //     aux[ source ].vm.$on( '')

            // }

            return self.afterInitialize.forEach( function ( init ) {
                init.call( self, smk, aux )
            } )
        } )
    }
    // _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
    //
    return Tool

} )
