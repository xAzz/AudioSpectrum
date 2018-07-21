const canvas = document.getElementById("canvas")
const ctx = canvas.getContext("2d")
let wave = null

const draw = () => {
    wave.render()
    requestAnimationFrame(draw)
}

const render = () => {
    requestAnimationFrame(draw)
}

const init = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    canvas.onresize = () => {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
        wave.x = canvas.width / 2
        wave.y = canvas.height / 2
    }
    wave = new AudioSpectrum({
        src: "song.mp3",
        glow: 0,
        lineWidth: 6,
        strokes: {
            first: 8,
            second: 40,
            third: 5
        },
        rotationIncrement: 0.05
    })

    setTimeout(() => {
        render()
    }, 1e3)
}

class AudioReader {
    constructor(url) {
        this.audio = new Audio()
        this.audio.src = url
        this.frequencyBuffer = []
        this.signalSize = 32
        this.analyser = null
    }

    action(type) {
        switch (type) {
            case "play":
                this.audio.play()
            break
            case "stop":
                this.audio.stop()
            break
        }
    }

    read() {
        const context = new AudioContext()
        this.analyser = context.createAnalyser()
        const source = context.createMediaElementSource(this.audio)
        source.connect(this.analyser)
        this.analyser.connect(context.destination)
        this.analyser.fftSize = this.signalSize
        this.frequencyBuffer = new Uint8Array(this.analyser.frequencyBinCount)
    }

	readFrequency() {
        this.analyser.getByteFrequencyData(this.frequencyBuffer)
    }
    
    getFrequency() {
        let frequency = 0
        for (let offset = 0; offset < this.frequencyBuffer.length; offset++) frequency += this.frequencyBuffer[offset] * 100 / 256
		return frequency
    }
}

class AudioSpectrum extends AudioReader {
    constructor(config = {}) {
        super(config.src)
        this.read()
        this.action("pause")
        this.action("play")

        this.glow = config.glow
        this.lineWidth = config.lineWidth

        this.circleStrokes = {
            first: config.first,
            second: config.second,
            third: config.third
        }

        this.rotationIncrement = config.rotationIncrement
        this.speed = 0
        this.radius = {
            first: 100,
            second: 360,
            third: 400
        }

        this.newRadius1 = 100
        this.newRadius2 = 360
        this.newRadius3 = 400

        this.innerCircleRadius = this.radius.third
        this.outerCircleRadius = this.radius.third + 150

        this.newInnerCircleRadius = this.innerCircleRadius
        this.newOuterCircleRadius = this.outerCircleRadius

        this.cycle = 0
        this.randomsOld = []
        this.randomsNow = []

        this.colors = ["#f16971", "#333333"]

        this.x = canvas.width / 2
        this.y = canvas.height / 2
    }

    clear() {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    render() {
        this.clear()
        this.readFrequency()
        this.bounce(this.getFrequency() / 5)
        this.radius.first = this.lerp(this.radius.first, this.newRadius1, 0.2)
        this.radius.second = this.lerp(this.radius.second, this.newRadius2, 0.2)
        this.radius.third = this.lerp(this.radius.third, this.newRadius3, 0.2)
        this.innerCircleRadius = this.lerp(this.innerCircleRadius, this.newInnerCircleRadius, 0.2)
        this.outerCircleRadius = this.lerp(this.outerCircleRadius, this.newOuterCircleRadius, 0.2)

        if (this.glow) {
            ctx.shadowBlur = this.glow
            ctx.shadowColor = "#f16971"
        }

        ctx.beginPath()
        ctx.lineWidth = this.circleStrokes.first ? this.circleStrokes.first : 8
        ctx.strokeStyle = this.colors[0]
        ctx.arc(this.x, this.y, this.radius.first, 0, 2 * Math.PI)
        ctx.stroke()
        ctx.closePath()

        ctx.beginPath()
        ctx.lineWidth = this.circleStrokes.second ? this.circleStrokes.second : 40
        ctx.strokeStyle = this.colors[1]
        ctx.arc(this.x, this.y, this.radius.second, 0, 2 * Math.PI)
        ctx.stroke()
        ctx.closePath()

        ctx.beginPath()
        ctx.lineWidth = this.circleStrokes.third ? this.circleStrokes.third : 5
        ctx.strokeStyle = this.colors[0]
        ctx.arc(this.x, this.y, this.radius.third, 0, 2 * Math.PI)
        ctx.stroke()
        ctx.closePath()

        this.speed += this.rotationIncrement ? this.rotationIncrement : 0.05
        if (this.cycle === 0) {
            let randoms = []
            for (let i = 0; i < 40; i++) {
                let rand = (Math.random() * 0.2) + this.getFrequency() / 10000
                randoms.push(rand)
            }
            this.randomsOld = this.randomsNow
            this.randomsNow = randoms
        }
        
        for (let i = 0; i < 180; i++) {
            const x = canvas.width / 2
            const y = canvas.height / 2
            const lerped = this.lerp(this.outerCircleRadius - this.innerCircleRadius, this.outerCircleRadius, this.lerp(
              this.lerp(this.randomsOld[~~(i / 10)], this.randomsNow[~~(i / 10)], this.cycle / 20),
              this.lerp(this.randomsOld[~~(i / 10) + 1], this.randomsNow[~~(i / 10) + 1], this.cycle / 20),
            (i % 10) / 10))
            this.lineAtAngle(x, y, this.speed + i * 2, this.innerCircleRadius, lerped)
        }

        this.cycle++
        this.cycle %= 20
    }

    bounce(step) {
        this.newRadius1 = step
        this.newRadius2 = step + 260
        this.newRadius3 = step + 300
        this.newInnerCircleRadius = this.newRadius3
        this.newOuterCircleRadius = this.newRadius3 + 50
    }

    reset() {
        this.lastRadius1 = 0
        this.lastRadius2 = 0
        this.lastRadius3 = 0
    }

    lineAtAngle(startX, startY, angleDeg, offset, length) {
        const angle = angleDeg * (Math.PI / 180)
        const startXPos = Math.cos(angle) * offset + startX
        const startYPos = Math.sin(angle) * offset + startY

        const endXPos = Math.cos(angle) * length + startXPos
        const endYPos = Math.sin(angle) * length + startYPos

        ctx.beginPath()
        ctx.moveTo(startXPos, startYPos)
        ctx.lineTo(endXPos, endYPos)
        ctx.lineWidth = this.lineWidth ? this.lineWidth : 6
        ctx.stroke()
        ctx.closePath()
    }

    random(min, max) {
        return Math.random() * (max - min + 1) + min >> 0   
    }

    lerp(a, b, n) {
        return (1 - n) * a + n * b
    }
}

init()
