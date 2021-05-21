import React, { useState } from "react";
import { render, screen } from '@testing-library/react';
import App from './App';
import ReactDOM from 'react-dom'


test('renders without crashing', () => {
  const div = document.createElement('div')
  ReactDOM.render(<App />, div)
  ReactDOM.unmountComponentAtNode(div)
})

