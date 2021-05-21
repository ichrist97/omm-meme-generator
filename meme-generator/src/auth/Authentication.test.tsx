import React, { useState } from "react";
import { render, screen } from '@testing-library/react';
import ReactDOM from 'react-dom'
import { SignIn } from "./Authentication";

test('renders without crashing', () => {
  const setUser = jest.fn();
  const div = document.createElement('div')
  ReactDOM.render(<SignIn setUser={setUser}/>, div)
  ReactDOM.unmountComponentAtNode(div)
})