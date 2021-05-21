import React, { useState } from "react";
import { render, screen } from '@testing-library/react';
import ReactDOM from 'react-dom'
import SignInComponent from "./SignInComponent"


test('renders without crashing', () => {
  const open = false;
  const onClose = jest.fn();
  const onSubmit = jest.fn();
  const div = document.createElement('div')
  ReactDOM.render(<SignInComponent open={open} onClose={onClose} onSubmit={onSubmit} />, div)
  ReactDOM.unmountComponentAtNode(div)
})