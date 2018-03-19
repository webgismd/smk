include.module( 'viewer-leaflet', [ 'viewer', 'leaflet' ], function () {

    function ViewerLeaflet() {
        SMK.TYPE.ViewerBase.prototype.constructor.apply( this, arguments )
    }

    if ( !SMK.TYPE.Viewer ) SMK.TYPE.Viewer = {}
    SMK.TYPE.Viewer.leaflet = ViewerLeaflet

    $.extend( ViewerLeaflet.prototype, SMK.TYPE.ViewerBase.prototype )
    // _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
    //
    ViewerLeaflet.prototype.initialize = function ( smk ) {
        var self = this

        SMK.TYPE.ViewerBase.prototype.initialize.apply( this, arguments )

        this.deadViewerLayer = {}

        var el = smk.addToContainer( '<div class="smk-viewer">' )

        self.map = L.map( el, {
            dragging:       false,
            zoomControl:    false,
            boxZoom:        false,
            doubleClickZoom:false
        } )

        self.map.scrollWheelZoom.disable()

        if ( smk.viewer ) {
            if ( smk.viewer.initialExtent ) {
                var bx = smk.viewer.initialExtent
                self.map.fitBounds( [ [ bx[ 1 ], bx[ 0 ] ], [ bx[ 3 ], bx[ 2 ] ] ] );
            }

            if ( smk.viewer.baseMap )
                self.setBasemap( smk.viewer.baseMap )
        }

        self.map.on( 'zoomstart', changedView )
        self.map.on( 'movestart', changedView )
        changedView()

        self.finishedLoading( function () {
            self.map.eachLayer( function ( ly ) {
                if ( !ly._smk_id ) return

                if ( self.deadViewerLayer[ ly._smk_id ] ) {
                    self.map.removeLayer( ly )
                    delete self.visibleLayer[ ly._smk_id ]
                    // console.log( 'remove', ly._smk_id )
                }
            } )

            Object.keys( self.deadViewerLayer ).forEach( function ( id ) {
                delete self.deadViewerLayer[ id ]
                delete self.visibleLayer[ id ]
                // console.log( 'dead', id )
            } )
        } )

        function changedView() {
            self.changedView( self.getView() )
        }
    }
    // _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
    //
    ViewerLeaflet.prototype.getView = function () {
        return {
            center: this.map.getCenter(),
            zoom: this.map.getZoom()
        }
    }
    // _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
    //
    ViewerLeaflet.prototype.basemap.ShadedRelief.labels = [ 'ShadedReliefLabels' ]
    ViewerLeaflet.prototype.basemap.Gray.labels = [ 'GrayLabels' ]
    ViewerLeaflet.prototype.basemap.DarkGray.labels = [ 'DarkGrayLabels' ]
    ViewerLeaflet.prototype.basemap.Imagery.labels = [ 'ImageryTransportation', 'ImageryLabels' ]
    ViewerLeaflet.prototype.basemap.Oceans.labels = [ 'OceansLabels' ]
    // ViewerLeaflet.prototype.basemap.Terrain.labels = [ 'TerrainLabels' ]

    ViewerLeaflet.prototype.setBasemap = function ( basemapId ) {
        var self = this

        if( this.currentBasemap ) {
            this.currentBasemap.forEach( function ( ly ) {
                self.map.removeLayer( ly );
            } )
        }

        this.currentBasemap = this.createBasemapLayer( basemapId );

        this.map.addLayer( this.currentBasemap[ 0 ] );
        this.currentBasemap[ 0 ].bringToBack();

        for ( var i = 1; i < this.currentBasemap.length; i++ )
            this.map.addLayer( this.currentBasemap[ i ] );

        this.changedBaseMap( { baseMap: basemapId } )
    }

    ViewerLeaflet.prototype.createBasemapLayer = function ( basemapId ) {
        var lys = []
        lys.push( L.esri.basemapLayer( basemapId, { detectRetina: true } ) )

        if ( this.basemap[ basemapId ].labels )
            this.basemap[ basemapId ].labels.forEach( function ( id ) {
                lys.push( L.esri.basemapLayer( id, { detectRetina: true } ) )
            } )

        return lys
    }
    // _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
    //
    ViewerLeaflet.prototype.addViewerLayer = function ( viewerLayer ) {
        this.map.addLayer( viewerLayer )
    }
    // _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
    //
    ViewerLeaflet.prototype.zoomToFeature = function ( layer, feature ) {
        this.map.fitBounds( feature.highlightLayer.getBounds(), {
            paddingTopLeft: L.point( 300, 100 ),
            animate: false
        } )
    }

} )
