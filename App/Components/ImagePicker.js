var api = require('../Utils/api');
var ImagePickerManager = require('NativeModules').ImagePickerManager;

import React, {
  CameraRoll,
  View,
  Text,
  Image,
  StyleSheet,
  Component,
  ScrollView,
  TouchableHighlight,
  TextInput
} from 'react-native';

class ImagePicker extends Component {

  state = {
    avatarSource: null,
    videoSource: null
  };

  selectPhotoTapped() {
    const options = {
      title: 'Photo Picker',
      takePhotoButtonTitle: 'Take Photo...',
      chooseFromLibraryButtonTitle: 'Choose from Library...',
      quality: 0.5,
      maxWidth: 300,
      maxHeight: 300,
      storageOptions: {
        skipBackup: true
      },
      allowsEditing: true
    };

    ImagePickerManager.showImagePicker(options, (response) => {
      console.log('Response = ', response);

      if (response.didCancel) {
        console.log('User cancelled photo picker');
      }
      else if (response.error) {
        console.log('ImagePickerManager Error: ', response.error);
      }
      else if (response.customButton) {
        console.log('User tapped custom button: ', response.customButton);
      }
      else {
        // You can display the image using either:
        //const source = {uri: 'data:image/jpeg;base64,' + response.data, isStatic: true};
        var source;
        if (Platform.OS === 'android') {
          source = {uri: response.uri, isStatic: true};
        } else {
          source = {uri: response.uri.replace('file://', ''), isStatic: true};
        }

        this.setState({
          avatarSource: source
        });
      }
    });
  }

  render() {
    return (
      <View style={styles.container}>
        <TouchableHighlight onPress={this.selectPhotoTapped.bind(this)}>
          <View>
          {this.state.avatarSource === null ? <Text>Edit Photo</Text>:<Image style={styles.avatar} source={this.state.avatarSource} />}
          </View>
        </TouchableHighlight>
      </View>

    );
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF'
  },
  avatarContainer: {
    borderColor: '#9B9B9B',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatar: {
    borderRadius: 75,
    width: 150,
    height: 150
  }
});


module.exports = ImagePicker;
