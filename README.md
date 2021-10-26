# Apelles

A node.js GCP proxy to resize and compress pictures on the fly with cache capabilities.

## Connect to GCP and environmental variables

Replace `.env.example` with your `.env`
Replace `serviceAccount.json.example` with your `serviceAccount.json`

## How to add pictures

You will need to do a Post request. For the Body you will need to use form-data with a Key **picture** and the picture to upload as its Value.

```js
const formData = new FormData();
formData.append("picture", file);
axios.post("http://localhost:3050", formData, {
	headers: { "X-Requested-With": "XMLHttpRequest" },
});
```

## How to view / resize pictures

When uploading successfully, the server returns an object with the parameter **url**. Using this url we han view the picture.
We can edit the picture using url parameters such as `?w=1920&h=1080&greyscale`.

## Parameters and Options

`w=`: Set the width of the picture in pixels.

`h=`: Set the height of the picture in pixels.

`fit=`: Change the resizing method. Available options: `cover, contain, fill, inside, outside`

`position=`: Change the center of the resize. Available options: `top, right top, right, right bottom, bottom, left bottom, left, left top`

`greyscale`: Change image to greyscale (boolean)

## Create a container

```bash
docker build -t needit/apelles:latest .
```
