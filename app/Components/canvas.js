import React, { Component, PureComponent } from 'react';
import PropTypes from 'prop-types';
import io from 'socket.io-client';
import styles from '../styles';
import Axios from 'axios';


import Link from './link';

class Canvas extends PureComponent {
  constructor (props) {
    super(props);
    this.state = {
      draw: false,
      x: '',
      y: '',
      url: '',
      undo: [],
      image: ''
    }

    this.socket = io('http://localhost:3000');
    this.socket.on('new', (data) => {
      this.update(data);
    })
    this.socket.on('update', (data) => {
      console.log('data ->',data)
      this.update(data);
    })
    this.socket.on('hello', data => console.log(data))
    
    this.draw = this.draw.bind(this);
    this.start = this.start.bind(this);
    this.end = this.end.bind(this);
    this.download = this.download.bind(this);
    this.save = this.save.bind(this);
    this.undo = this.undo.bind(this);
    this.update = this.update.bind(this);
  }

  // the idea is that 'save' will push image data to an array for later rerendering...
  // once saved the data could be used for undo feature as well as sharing content live
  // currently not working...
  // 'toDataURL' method does not seem to be the right format to draw onto canvas...
  // trying to make a(n) ImageObject to draw onto canvas instead...
  save () {
    let canvas = document.getElementById('canvas');
    if(this.state.undo.length <= 20) {
      let undo = [...this.state.undo];
      createImageBitmap(canvas,0,0,canvas.width,canvas.height)
      .then(data => {
        undo.push(data);
        this.setState({undo});
      })
    }
    else {
      let undo = [...this.state.undo];
      undo.shift();
      createImageBitmap(canvas,0,0,canvas.width,canvas.height)
      .then(data => {
        undo.push(data);
        this.setState({undo});
      })
    }
  }

  // 'undo' should 'pop' off the last saved image from state and draw it to canvas
  // trying to create an image with src set to image url but this isnt working
  // going to try and use an Image object instead
  // using 'drawImage' with that image object should work...
  undo () {
    let undo = [...this.state.undo];
    let data = undo.pop();
    this.setState({undo});
    let canvas = this.refs.canvas.getContext('2d');
    canvas.clearRect(0,0,2000,2000);
    canvas.drawImage(data,0,0);
    this.send();
  }

  // create base64 string to send 
  // then decode that string on the way back
  send () {
    const canvas = document.getElementById('canvas');
    this.socket.emit('update', canvas.toDataURL());
  }

  update (data) {
    let canvas = this.refs.canvas.getContext('2d');
    let img = new Image();
    img.onload = function () {
      canvas.clearRect(0,0,2000,2000);
      canvas.drawImage(this, 0, 0);
    }
    img.src = data;
  }

  // 'start' triggers the start of drawing to canvas
  // changes draw in state to true.
  // also saves the current x,y possition.
  // called by the 'onMouseDown' listener
  start (event) {
    this.setState({
      draw:true,
      x: event.clientX,
      y: event.clientY,
    })
  }

  // ends drawing on canvas
  // sets draw to false
  // called on 'onMouseUp' or 'onMouseLeave'
  end () {
    this.setState({draw:false})
  }

  // saves the current state of the canvas in a variable
  // creates an imageURL and attaches that to the 'download' anchor
  // triggers download in browser... uses JPEG format
  download () {
    let canvas = document.getElementById('canvas');
    let el = document.getElementById('download');
    this.setState({url:canvas.toDataURL('image/jpeg', 1.0)});
    el.setAttribute('download', 'myPrettyPicture:)');
  }

  // 

  // called on 'onMouseMove'
  // if draw in state is true, draws line from x,y in state to x,y from client
  // saves the clients x,y to state for the next draw invokation
  draw (event) {
    if(this.state.draw) {
      const canvas = this.refs.canvas.getContext('2d');
      canvas.beginPath();
      canvas.strokeStyle = this.props.color;
      canvas.lineCap = 'round';
      canvas.lineJoin = 'round';
      canvas.lineWidth = this.props.weight;
      canvas.moveTo(this.state.x - 30, this.state.y - 30);
      canvas.lineTo(event.clientX - 30, event.clientY - 30);
      canvas.stroke();
      canvas.closePath();
      this.setState({x:event.clientX,y:event.clientY});
    }
  }


  render () {
    return (
      <div style={{width:'100%',height:'100%'}}>
        <canvas 
          id="canvas"
          ref="canvas" 
          key={this.props.clear}
          onMouseDown={(event)=>{
            this.start(event);
            this.save();
          }}
          onMouseMove={this.draw} 
          onMouseUp={()=> {
            this.end();
            this.send();
          }} 
          onMouseLeave={this.end}
          width={this.props.width} 
          height={this.props.height} 
          style={styles.uiCanvas.base}>
        </canvas>
        <a className="function" id="download" onClick={this.download} href={this.state.url} style={{display:'block'}}>{'download'}</a>
        <a className="function" onClick={this.undo}>{'undo'}</a>
      </div>
    )
  }
}

Canvas.propTypes = {
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  clear: PropTypes.string,
  weight: PropTypes.string,
  color: PropTypes.string,
  clearFunc: PropTypes.func
}

export default Canvas;