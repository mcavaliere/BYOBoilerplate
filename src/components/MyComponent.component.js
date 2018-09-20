import React, { Component } from 'react';
import { Text, View } from 'react-native';
import Constants from '../../shared/constants';

// Styles for this View
import Styles from './MyComponent.styles';

// Custom components
//import {} from '../../components';

// Sub-views
//import {} from '../';

export default class MyComponent extends Component {
	render() {
		return (
			<View style={[ Styles.container, this.props.style ]}>
				<Text>Component placeholder for MyComponent</Text>
			</View>
		)
	}
}
