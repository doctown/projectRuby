import React, {
  View,
  Component,
  Text,
  TouchableHighlight,
  StyleSheet,
  StatusBar,
  Dimensions,
} from 'react-native';
import Mapbox from 'react-native-mapbox-gl';
import io from 'socket.io-client/socket.io';
window.navigator.userAgent = "react-native";

var api = require('../Utils/api');

var mapRef = 'mapRef';

var _ = require('lodash');

var MapboxMap = React.createClass({
  mixins: [Mapbox.Mixin],
  getInitialState() {
    return {
      zoom: 17,
      boundSet: false,
      currentLoc: undefined,
      annotations: [{
        coordinates: [40.72052634, -73.97686958312988],
        'type': 'point',
        title: 'This is marker 1',
        subtitle: 'It has a rightCalloutAccessory too',
        rightCalloutAccessory: {
          url: 'https://cldup.com/9Lp0EaBw5s.png',
          height: 25,
          width: 25
        },
        annotationImage: {
          url: 'https://cldup.com/CnRLZem9k9.png',
          height: 25,
          width: 25
        },
        id: 'marker1'
      }],
      socket: io('http://159.203.222.32:4568', {jsonp: false})
    };
  },
  onRegionChange(location) {
    this.setState({ currentZoom: location.zoom });
  },
  onRegionWillChange(location) {
    console.log(location);
  },
  onUpdateUserLocation(location) {
    this.emitLocationThrottled(location);
    this.setState({currentLoc: location});
  },
  onOpenAnnotation(annotation) {
    console.log(annotation);
  },
  onRightAnnotationTapped(e) {
    console.log(e);
  },
  onLongPress(location) {
    console.log('long pressed', location);
  },
  onTap(location) {
    console.log('tapped', location);
  },
  componentDidMount(){
    this.setUserTrackingMode(mapRef, this.userTrackingMode.follow);
    this.socket = io.connect('http://159.203.222.32:4568', {jsonp: false});
    this.socket.emit('registerID', this.props.userInfo.uid);

    this.emitLocationThrottled = _.throttle((location) => {
      this.socket.emit('change location', location);
      console.log('updating location');
    }, 15000);

    api.getUserFriends(this.props.userInfo.uid).then((friendData) => {
      var friends = friendData.map((friend) => {
        return friend.uid;
      });
      this.socket.emit('registerFriends', friends);
    });
    this.socket.on('chat message', (msg) => {
      console.log('Woohoo it worked! ', msg);
    });

    this.socket.on('change location', (changeInfo) => {
      var id = changeInfo.id;
      var loc = changeInfo.loc;

      var myLat = this.state.currentLoc.latitude;
      var myLong = this.state.currentLoc.longitude;
      var lat = loc.latitude;
      var long = loc.longitude;
      if (loc.latitude !== this.state.currentLoc.latitude) {
        this.updateAnnotation(mapRef, {
          coordinates: [lat, long],
          'type': 'point',
          title: id,
          subtitle: 'New Subtitle',
          annotationImage: {
            url: 'http://findicons.com/files/icons/367/ifunny/128/dog.png',
            height: 25,
            width: 25
          },
          id: id
        });

        if (!this.state.boundSet) {
          this.setVisibleCoordinateBoundsAnimated(mapRef, lat, long, myLat, myLong, 50, 50, 50, 50);
          this.state.boundSet = true;
        }
      }
    });

    this.socket.on('logoff', (id) => {
      this.removeAnnotation(mapRef, id);
    })

    this.socket.on('found location', (loc) => {
      console.log('This is the loc from website: ', loc);
      // loc comes in as [longitude, latitude] which is what the webapp version wants,
      // but the react native version wants the [latitude, longitude], so we flip them.
      var locFlip = [loc[1], loc[0]];
      this.setVisibleCoordinateBoundsAnimated(mapRef, locFlip[0], locFlip[1], this.state.currentLoc.latitude, this.state.currentLoc.longitude, 100, 0, 0, 0);
      // fetch(`https://api.mapbox.com/v4/directions/mapbox.driving/${this.state.currentLoc.longitude},${this.state.currentLoc.latitude};${loc[0]},${loc[1]}.json?access_token=${loc[2]}`,
      //   {method: 'get'})
      //   .then((res) => {console.log(res)});
    });
  },
  render: function() {
    StatusBar.setHidden(true);
    return (
      <View style={styles.main}>
      <Mapbox
      style={styles.container}
      direction={0}
      rotateEnabled={true}
      scrollEnabled={true}
      zoomEnabled={true}
      showsUserLocation={true}
      ref={mapRef}
      accessToken={'pk.eyJ1IjoiaW5qZXllbyIsImEiOiJHYUJMWGV3In0.-9Wcu6yJNQmem2IXWaRuIg'}
      styleURL={this.mapStyles.emerald}
      userTrackingMode={this.userTrackingMode.none}
      centerCoordinate={this.state.center}
      zoomLevel={this.state.zoom}
      onRegionChange={this.onRegionChange}
      onRegionWillChange={this.onRegionWillChange}
      annotations={this.state.annotations}
      onOpenAnnotation={this.onOpenAnnotation}
      onRightAnnotationTapped={this.onRightAnnotationTapped}
      onUpdateUserLocation={this.onUpdateUserLocation}
      onLongPress={this.onLongPress}
      onTap={this.onTap} />
      </View>
      );
  }
});

var width = Dimensions.get('window').width;
var styles = StyleSheet.create({
  button: {
    width: 150,
    height: 200,
    backgroundColor: '#DDD'
  },
  container: {
    flex: 1,
    flexDirection: 'column',
    marginTop: -10,
    alignSelf: 'stretch',
    width: width
  },
  main: {
    flex: 1,
    alignItems: 'stretch',
    marginTop: 50
  }
});


module.exports = MapboxMap;
