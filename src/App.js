import React from "react";
import {
  makeStyles,
  ThemeProvider,
  createMuiTheme
} from "@material-ui/core/styles";
import { Component as Editor } from "./Editor";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import CssBaseline from "@material-ui/core/CssBaseline";
import { debounce } from "lodash";
import { js2wy } from "wenyanizer";
import "./App.css";

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
    margin: "0 auto",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column"
  },
  a: {
    color: 'white',
    textDecorationColor: 'white'
  },
  title: {
    margin: "32px 0",
    textAlign: "center"
  },
  paper: {
    maxHeight: 'max(calc(100vh - 250px), 400px)',
    overflow: 'auto',
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
    paddingLeft: theme.spacing(4),
    paddingRight: theme.spacing(4),
    boxShadow: "0 6px 16px 12px rgba(10, 10, 16, 0.2)"
  }
}));

export default function AutoGrid() {
  const [js, setJs] = React.useState(`function wenyanizer(js){
    var ast = parse(js);
    var asc = ast2asc(ast);
  	var wy = asc2wy(asc);
  	return wy;
}`);
  const [wy, setWy] = React.useState(`吾有一術。名之曰「文言轉換」
欲行是術。必先得一物。曰「覺誒斯」。
乃行是術曰。
    施「語法分析」於「覺誒斯」。名之曰「抽象語法樹」。
    施「樹鏈轉換」於「抽象語法樹」。名之曰「抽象語法鏈」。
    施「定稿」於「抽象語法鏈」。名之曰「文言」。
    乃得「文言」
是謂「文言轉換」之術也。`);
  const theme = React.useMemo(
    () =>
      createMuiTheme({
        palette: {
          type: "dark"
        }
      }),
    []
  );
  const classes = useStyles();
  const onJsChanged = React.useCallback(
    debounce((js) => {
      try {
        setWy(js2wy(js));
      } catch (e) {
        setWy(e.toString());
      }
    }, 1000),
    []
  );
  const onChange = React.useCallback(
    debounce((v) => {
      setJs(v);
      onJsChanged(v);
    }, 20),
    []
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className={classes.root}>
        <div className={classes.title}>
          <h1>文言转换 <a className={classes.a} href="https://github.com/zxch3n/wenyanizer">Wenyanizer</a></h1>
          <p>
            JavaScript →{" "}
            <a className={classes.a} href="https://github.com/LingDong-/wenyan-lang">文言文 Wenyan Lang</a>
          </p>
        </div>
        <Grid
          container
          spacing={2}
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
          }}
        >
          <Grid
            item
            xs={12}
            md={6}
            spacing={2}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center"
            }}
          >
            <Editor onChange={onChange} value={js} />
          </Grid>
          <Grid item xs={12} md={6} spacing={2}>
            <Paper className={classes.paper}>
              <pre>
                <code>{wy}</code>
              </pre>
            </Paper>
          </Grid>
        </Grid>
      </div>
    </ThemeProvider>
  );
}
