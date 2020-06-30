import React, { useState, useEffect, useCallback } from 'react'
import { auth, db } from './firebase'
import {
  Button,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  TextField
} from '@material-ui/core'
import './App.css'

function App() {
  const [user, setUser] = useState({ uid: null, isAnonymous: false })
  const [tasks, setTasks] = useState([])
  const [inputValue, setInputValue] = useState('')

  const fetchTasks = useCallback(async () => {
    if (!user.uid) {
      return
    }
    const snapShot = await db
      .collection('tasks')
      .where('uid', '==', user.uid)
      .orderBy('created_at')
      .get()
    let tempTasks = []
    snapShot.forEach(doc => {
      tempTasks.push({
        id: doc.id,
        text: doc.data().text
      })
    })
    setTasks(tempTasks)
  }, [user.uid])

  useEffect(() => {
    auth.onAuthStateChanged(user => {
      if (!user) {
        return
      }
      setUser(user)
      fetchTasks()
    })
  }, [fetchTasks])

  return (
    <div className="App">
      <Header />
      <main style={{ padding: '24px' }}>
        <Authentication
          user={user}
          setUser={setUser}
          setTasks={setTasks}
          setInputValue={setInputValue}
        />
        <Todo
          user={user}
          tasks={tasks}
          inputValue={inputValue}
          setInputValue={setInputValue}
          fetchTasks={fetchTasks}
        />
      </main>
    </div>
  )
}

function Header() {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography type="title" color="inherit" style={{ fontSize: '20px' }}>
          React & Firebase & Material UI Sample Todo
        </Typography>
      </Toolbar>
    </AppBar>
  )
}

function Authentication(props) {
  const login = async () => {
    await auth.signInAnonymously().catch(error => {
      console.log(error.code)
      console.log(error.message)
    })
  }
  const logout = async () => {
    if (!auth.currentUser) {
      return
    }
    // ログアウトする匿名ユーザのタスクをDBからすべて消去
    const snapShot = await db.collection('tasks').where('uid', '==', auth.currentUser.uid).get()
    snapShot.forEach(doc => doc.ref.delete())
    // 匿名ユーザを消去
    await auth.currentUser.delete().catch(error => {
      console.log(error.code)
      console.log(error.message)
      alert(
        'ログアウトに失敗しました。ログインから時間が経っている場合は、再度ログインしてからログアウトしてください。'
      )
    })
    // ステートを初期化
    props.setUser({})
    props.setTasks([])
    props.setInputValue('')
  }
  return (
    <section>
      {!props.user.uid ? (
        <Button variant="contained" color="primary" onClick={login}>
          匿名ログイン
        </Button>
      ) : (
        <Button variant="contained" color="secondary" onClick={logout}>
          ログアウト
        </Button>
      )}
    </section>
  )
}

function Todo(props) {
  const placeholder = props.user.uid ? 'Todoを入力' : '匿名ログインしてください'

  const callbackSetInputValue = event => {
    props.setInputValue(event.target.value)
  }

  const addTask = async () => {
    if (!props.inputValue) {
      alert('何も入力されていません')
      return
    }
    await db.collection('tasks').add({
      text: props.inputValue,
      created_at: new Date(),
      uid: props.user.uid
    })
    await props.fetchTasks()
    props.setInputValue('')
  }

  const removeTask = async event => {
    await db.collection('tasks').doc(event.target.value).delete()
    props.fetchTasks()
  }

  return (
    <section>
      <List>
        {props.tasks.map(task => {
          return (
            <ListItem key={task.id}>
              <Checkbox color="primary" value={task.id} onClick={removeTask} />
              <ListItemText primary={task.text} />
            </ListItem>
          )
        })}
      </List>

      <div style={{ display: 'flex', alignItems: 'baseline' }}>
        <TextField
          style={{ width: '232px', marginRight: '12px' }}
          label="Todo"
          placeholder={placeholder}
          value={props.inputValue}
          onChange={callbackSetInputValue}
        />
        <Button variant="contained" color="primary" disabled={!props.user.uid} onClick={addTask}>
          追加
        </Button>
      </div>
    </section>
  )
}

export default App
