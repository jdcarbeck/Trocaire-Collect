const Form = require('../models/HRform')
const rsa = require('../crypto/rsa')
const aes = require('../crypto/aes')
var csv = require('csv-express')

rsa.initLoadServerKeys(__dirname + "/../" )

createForm = (req, res) => {
    let body = req.body
    var formId = req.body.formId
    console.log(body)

    let buff = Buffer.from(body.data, 'base64')
    var encodedPaylod = Buffer.alloc(384)
    let data_len = buff.length - encodedPaylod.length;
    var encodedData = Buffer.alloc(data_len)
    
    buff.copy(encodedPaylod, 0)
    buff.copy(encodedData, 0, encodedPaylod.length)

    var base64encode = encodedPaylod.toString('base64')
    var base64encodeData = encodedData.toString('base64')

    let text = rsa.decrypt(rsa.serverPrivate, base64encode)
    let paylod = JSON.parse(text)
    console.log(paylod)
    let bodyStr = aes.decrypt(paylod.key, paylod.iv, base64encodeData)
    body = JSON.parse(bodyStr)
    console.log(body)

    body.incident_date = new Date(body.incident_date)
    body.attention_date = new Date(body.attention_date)

    if(!body) {
        return res.status(400).json({
            sucesss: false,
            error: 'You must provide a valid form'
        })
    }
    const form = new Form(body)

    if(!form){
        return res.status(400).json({
            sucesss: false,
            error: 'Could not create form in given syle'
        })
    }

    form
        .save()
        .then(()=> {
            return res.status(201).send(formId + "-success")
        })
        .catch(error => {
            return res.status(400).json({
                error,
                message: 'Unable to create form'
            })
        })
}

updateForm = async (req, res) => {
    const body = req.body

    if(!body) {
        return res.status(400).json({
            sucesss: false,
            error: 'No body provided for update'
        })
    }

    Form.findOne({ _id: req.params.id }, (err, form) => {
        if(err){
            return res.status(404).json({
                err,
                message: 'Form not found with given id'

            })
        }
        // The values are added here
        // form.value = body.value
        form
            .save()
            .then(()=> {
                return res.status(200).json({
                    sucesss: true,
                    id: form._id,
                    message: 'Form updated!',
                })
            })
            .catch(error => {
                return res.status(404).json({
                    error,
                    message: 'Form not updated!',
                })
            })
    })
}

deleteForm = async (req, res) => {
    await Form.findOneAndDelete({ _id: req.params.id }, (err, form) => {
        if (err) {
            return res.status(400).json({ success: false, error: err })
        }

        if (!form) {
            return res
                .status(404)
                .json({ success: false, error: `Form not found` })
        }

        return res.status(200).json({ success: true, data: form })
    }).catch(err => console.log(err))
}

getFormById = async(req, res) => {
    await Form.findOne({ _id: req.params.id }, (err, form) => {
        if (err) {
            return res.status(400).json({ success: false, error: err })
        }

        if (!form) {
            return res
                .status(404)
                .json({ success: false, error: `Form not found` })
        }
        return res.status(200).json({ success: true, data: form })
    }).catch(err => console.log(err))
}

getForm = async (req, res) => {
    await Form.find({}, (err, form) => {
        if (err) {
            return res.status(400).json({ success: false, error: err })
        }
        if (!form.length) {
            return res
                .status(404)
                .json({ success: false, error: `Form not found` })
        }
        return res.status(200).json({ success: true, data: form })
    }).catch(err => console.log(err))
}

download = (req, res) => {
    var filename = "forms.csv"
    var dataArray;
    console.log('download!')
    Form.find().lean().exec({}, (err, forms) => {
        if (err) res.send(err)
        res.statusCode = 200
        res.setHeader('Content-Type', 'text/csv')
        res.setHeader("Content-Disposition", 'attachment; filename='+filename)
        res.csv(forms, true)
    })
}

module.exports = {
    createForm,
    updateForm,
    deleteForm,
    getForm,
    getFormById,
    download,
}